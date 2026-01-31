import type { Job } from '../types';

export interface TimingResult {
  earliestStart: number;
  earliestFinish: number;
  effectiveDuration: number;
  isCritical: boolean;
}

export interface TimingAnalysis {
  nodeTiming: Map<string, TimingResult>;
  criticalPath: string[];
  totalDuration: number;
}

/**
 * Compute timing analysis for a job DAG using topological sort + forward pass.
 * Returns earliest start/finish for each node and the critical path.
 */
export function computeTiming(
  jobs: Job[],
  durationOverrides: Map<string, number> = new Map()
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

  // Forward pass: compute earliest start/finish
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  const effectiveDuration = new Map<string, number>();

  for (const id of topoOrder) {
    const job = jobMap.get(id)!;
    const dur = durationOverrides.has(id)
      ? durationOverrides.get(id)!
      : (job.avgDurationMinutes ?? 0);
    effectiveDuration.set(id, dur);

    // Earliest start = max of all parents' earliest finish
    let es = 0;
    for (const dep of job.dependencies) {
      if (jobIds.has(dep)) {
        const parentFinish = earliestFinish.get(dep) ?? 0;
        if (parentFinish > es) es = parentFinish;
      }
    }
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
    // Work backward: find all nodes on the critical path
    const remaining = [terminalNode];
    criticalSet.add(terminalNode);

    while (remaining.length > 0) {
      const id = remaining.pop()!;
      criticalPath.push(id);
      const job = jobMap.get(id)!;
      const es = earliestStart.get(id)!;

      // A parent is on the critical path if its earliest finish equals this node's earliest start
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

  // Build result map
  const nodeTiming = new Map<string, TimingResult>();
  for (const id of topoOrder) {
    nodeTiming.set(id, {
      earliestStart: earliestStart.get(id)!,
      earliestFinish: earliestFinish.get(id)!,
      effectiveDuration: effectiveDuration.get(id)!,
      isCritical: criticalSet.has(id),
    });
  }

  return { nodeTiming, criticalPath, totalDuration };
}
