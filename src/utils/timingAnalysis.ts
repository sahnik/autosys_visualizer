import type { Job } from '../types';

export interface TimingResult {
  earliestStart: number;
  earliestFinish: number;
  effectiveDuration: number;
  isCritical: boolean;
  isFixed: boolean;
  fixedStartOffset: number;
  waitTime: number;
  upstreamCanHelp: boolean;
}

export interface TimingAnalysis {
  nodeTiming: Map<string, TimingResult>;
  criticalPath: string[];
  totalDuration: number;
  totalWaitTime: number;
  referenceTime: string;
}

/**
 * Parse "HH:MM" wall-clock time to minutes since midnight.
 * Returns null if the format is invalid.
 */
export function parseWallClockTime(timeStr: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Convert wall-clock lastRunStart times to relative offsets from the earliest
 * start across all jobs. Only includes jobs where fixedFlags indicates fixed.
 * Returns the offsets map and the reference time string (earliest HH:MM).
 */
export function computeFixedStartOffsets(
  jobs: Job[],
  fixedFlags: Map<string, boolean>
): { offsets: Map<string, number>; referenceTime: string } {
  // First, find the earliest lastRunStart across ALL jobs (not just fixed ones)
  // to establish T=0
  let minMinutes = Infinity;
  let refTimeStr = '';
  const parsedStarts = new Map<string, number>();

  for (const job of jobs) {
    if (job.lastRunStart) {
      const mins = parseWallClockTime(job.lastRunStart);
      if (mins !== null) {
        parsedStarts.set(job.id, mins);
        if (mins < minMinutes) {
          minMinutes = mins;
          refTimeStr = job.lastRunStart;
        }
      }
    }
  }

  if (minMinutes === Infinity) {
    return { offsets: new Map(), referenceTime: '' };
  }

  // Check for midnight-crossing (naive V1: warn if span > 18h)
  let maxMinutes = 0;
  for (const mins of parsedStarts.values()) {
    if (mins > maxMinutes) maxMinutes = mins;
  }
  if (maxMinutes - minMinutes > 18 * 60) {
    console.warn(
      'Fixed-time analysis: wall-clock span exceeds 18h — midnight-crossing times may be inaccurate'
    );
  }

  // Build offsets for fixed jobs only
  const offsets = new Map<string, number>();
  for (const job of jobs) {
    if (fixedFlags.get(job.id) && parsedStarts.has(job.id)) {
      offsets.set(job.id, parsedStarts.get(job.id)! - minMinutes);
    }
  }

  return { offsets, referenceTime: refTimeStr };
}

/**
 * Compute timing analysis for a job DAG using topological sort + forward pass.
 * Returns earliest start/finish for each node and the critical path.
 * Supports duration overrides and fixed-time offsets.
 */
export function computeTiming(
  jobs: Job[],
  durationOverrides: Map<string, number> = new Map(),
  fixedStartOffsets: Map<string, number> = new Map()
): TimingAnalysis {
  const jobMap = new Map<string, Job>();
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  const jobIds = new Set(jobs.map((j) => j.id));

  for (const job of jobs) {
    jobMap.set(job.id, job);
    inDegree.set(job.id, 0);
    children.set(job.id, []);
  }

  // Build adjacency: edges go from dependency -> job (parent -> child)
  for (const job of jobs) {
    let degree = 0;
    for (const dep of job.dependencies) {
      if (jobIds.has(dep)) {
        children.get(dep)!.push(job.id);
        degree++;
      }
    }
    inDegree.set(job.id, degree);
  }

  // Kahn's topological sort
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    for (const child of children.get(id)!) {
      const newDeg = inDegree.get(child)! - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // Forward pass: compute earliest start/finish with fixed-time floors
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  const effectiveDuration = new Map<string, number>();
  const maxParentFinish = new Map<string, number>();
  const waitTimeMap = new Map<string, number>();

  for (const id of topoOrder) {
    const job = jobMap.get(id)!;
    const dur = durationOverrides.has(id)
      ? durationOverrides.get(id)!
      : (job.avgDurationMinutes ?? 0);
    effectiveDuration.set(id, dur);

    // Earliest start = max of all parents' earliest finish
    let mpf = 0;
    for (const dep of job.dependencies) {
      if (jobIds.has(dep)) {
        const parentFinish = earliestFinish.get(dep) ?? 0;
        if (parentFinish > mpf) mpf = parentFinish;
      }
    }
    maxParentFinish.set(id, mpf);

    // Apply fixed-time floor
    const fixedOffset = fixedStartOffsets.get(id);
    let es: number;
    if (fixedOffset !== undefined && fixedOffset > mpf) {
      es = fixedOffset;
    } else {
      es = mpf;
    }

    const wt = es - mpf;
    waitTimeMap.set(id, wt);

    earliestStart.set(id, es);
    earliestFinish.set(id, es + dur);
  }

  // Find total duration (max earliest finish)
  let totalDuration = 0;
  let terminalNode = topoOrder[0] ?? '';
  for (const id of topoOrder) {
    const ef = earliestFinish.get(id)!;
    if (ef > totalDuration) {
      totalDuration = ef;
      terminalNode = id;
    }
  }

  // Trace critical path backward from terminal node
  const criticalSet = new Set<string>();
  const criticalPath: string[] = [];

  if (topoOrder.length > 0) {
    const remaining = [terminalNode];
    criticalSet.add(terminalNode);

    while (remaining.length > 0) {
      const id = remaining.pop()!;
      criticalPath.push(id);
      const job = jobMap.get(id)!;
      const es = earliestStart.get(id)!;

      // A parent is on the critical path if its earliest finish equals this node's earliest start
      // For fixed nodes whose ES was set by the floor (not by a parent), no parent will match,
      // so the critical path naturally disconnects at fixed-time boundaries.
      for (const dep of job.dependencies) {
        if (jobIds.has(dep) && !criticalSet.has(dep)) {
          const parentFinish = earliestFinish.get(dep)!;
          if (parentFinish === es) {
            criticalSet.add(dep);
            remaining.push(dep);
          }
        }
      }
    }

    criticalPath.reverse();
  }

  // Compute total wait time on critical path
  let totalWaitTime = 0;
  for (const id of criticalPath) {
    totalWaitTime += waitTimeMap.get(id) ?? 0;
  }

  // Build result map
  const nodeTiming = new Map<string, TimingResult>();
  for (const id of topoOrder) {
    const isFixed = fixedStartOffsets.has(id);
    const fixedOffset = fixedStartOffsets.get(id) ?? 0;
    const mpf = maxParentFinish.get(id)!;
    const wt = waitTimeMap.get(id)!;

    nodeTiming.set(id, {
      earliestStart: earliestStart.get(id)!,
      earliestFinish: earliestFinish.get(id)!,
      effectiveDuration: effectiveDuration.get(id)!,
      isCritical: criticalSet.has(id),
      isFixed,
      fixedStartOffset: fixedOffset,
      waitTime: wt,
      upstreamCanHelp: isFixed ? mpf >= fixedOffset : true,
    });
  }

  return { nodeTiming, criticalPath, totalDuration, totalWaitTime, referenceTime: '' };
}
