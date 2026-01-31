import { useState, useMemo, useCallback, useRef } from 'react';
import type { Job } from '../types';
import { computeTiming, type TimingAnalysis } from '../utils/timingAnalysis';

interface UseTimingAnalysisReturn {
  timingEnabled: boolean;
  toggleTiming: () => void;
  timingResult: TimingAnalysis | null;
  baselineDuration: number | null;
  durationOverrides: Map<string, number>;
  setDurationOverride: (jobId: string, duration: number) => void;
  clearDurationOverride: (jobId: string) => void;
  resetAllOverrides: () => void;
}

export function useTimingAnalysis(jobs: Job[]): UseTimingAnalysisReturn {
  const [timingEnabled, setTimingEnabled] = useState(false);
  const [durationOverrides, setDurationOverrides] = useState<Map<string, number>>(new Map());
  const baselineRef = useRef<number | null>(null);

  const timingResult = useMemo(() => {
    if (!timingEnabled || jobs.length === 0) return null;
    return computeTiming(jobs, durationOverrides);
  }, [timingEnabled, jobs, durationOverrides]);

  // Compute baseline once when timing is enabled (no overrides)
  const baselineDuration = useMemo(() => {
    if (!timingEnabled || jobs.length === 0) return null;
    if (baselineRef.current !== null) return baselineRef.current;
    const baseline = computeTiming(jobs).totalDuration;
    baselineRef.current = baseline;
    return baseline;
  }, [timingEnabled, jobs]);

  const toggleTiming = useCallback(() => {
    setTimingEnabled((prev) => {
      if (prev) {
        // Disabling: reset baseline so it recomputes next time
        baselineRef.current = null;
        setDurationOverrides(new Map());
      }
      return !prev;
    });
  }, []);

  const setDurationOverride = useCallback((jobId: string, duration: number) => {
    setDurationOverrides((prev) => {
      const next = new Map(prev);
      next.set(jobId, duration);
      return next;
    });
  }, []);

  const clearDurationOverride = useCallback((jobId: string) => {
    setDurationOverrides((prev) => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  const resetAllOverrides = useCallback(() => {
    setDurationOverrides(new Map());
  }, []);

  return {
    timingEnabled,
    toggleTiming,
    timingResult,
    baselineDuration,
    durationOverrides,
    setDurationOverride,
    clearDurationOverride,
    resetAllOverrides,
  };
}
