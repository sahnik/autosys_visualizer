import { useState, useCallback, useEffect, useRef } from 'react';

function computeStorageKey(jobs: { id: string }[]): string {
  if (jobs.length === 0) return '';
  const sample = jobs.slice(0, 10).map((j) => j.id).join('|');
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
  }
  return `fixedtimes_${hash}`;
}

export interface UseFixedTimeOverridesReturn {
  /** Check if a job is fixed, considering overrides then import default */
  isJobFixed: (jobId: string, importDefault: boolean) => boolean;
  /** Set an explicit override for a job's fixed state */
  setFixedTimeOverride: (jobId: string, fixed: boolean) => void;
  /** Remove all overrides */
  clearAllFixedTimeOverrides: () => void;
  /** Get the resolved fixed flags for all jobs */
  resolvedFixedFlags: Map<string, boolean>;
}

export function useFixedTimeOverrides(
  jobs: { id: string; fixedStartTime?: boolean; lastRunStart?: string }[]
): UseFixedTimeOverridesReturn {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const storageKeyRef = useRef('');

  // Load from localStorage when jobs change
  useEffect(() => {
    const key = computeStorageKey(jobs);
    storageKeyRef.current = key;
    if (!key) {
      setOverrides(new Map());
      return;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: [string, boolean][] = JSON.parse(stored);
        setOverrides(new Map(parsed));
      } else {
        setOverrides(new Map());
      }
    } catch {
      setOverrides(new Map());
    }
  }, [jobs]);

  // Persist to localStorage whenever overrides change
  useEffect(() => {
    const key = storageKeyRef.current;
    if (!key) return;
    if (overrides.size === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(Array.from(overrides.entries())));
    }
  }, [overrides]);

  const isJobFixed = useCallback(
    (jobId: string, importDefault: boolean): boolean => {
      if (overrides.has(jobId)) return overrides.get(jobId)!;
      return importDefault;
    },
    [overrides]
  );

  const setFixedTimeOverride = useCallback((jobId: string, fixed: boolean) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(jobId, fixed);
      return next;
    });
  }, []);

  const clearAllFixedTimeOverrides = useCallback(() => {
    setOverrides(new Map());
  }, []);

  // Compute resolved flags for all jobs
  const resolvedFixedFlags = new Map<string, boolean>();
  for (const job of jobs) {
    const importDefault = !!(job.fixedStartTime && job.lastRunStart);
    const resolved = overrides.has(job.id) ? overrides.get(job.id)! : importDefault;
    // A job can only actually be fixed if it has a lastRunStart
    resolvedFixedFlags.set(job.id, resolved && !!job.lastRunStart);
  }

  return {
    isJobFixed,
    setFixedTimeOverride,
    clearAllFixedTimeOverrides,
    resolvedFixedFlags,
  };
}
