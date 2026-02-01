import { useState, useMemo, useCallback, useRef } from 'react';
import type { Job } from '../types';
import { computeTiming, computeFixedStartOffsets, type TimingAnalysis } from '../utils/timingAnalysis';
import { useFixedTimeOverrides } from './useFixedTimeOverrides';

interface UseTimingAnalysisReturn {
  timingEnabled: boolean;
  toggleTiming: () => void;
  timingResult: TimingAnalysis | null;
  baselineDuration: number | null;
  durationOverrides: Map<string, number>;
  setDurationOverride: (jobId: string, duration: number) => void;
  clearDurationOverride: (jobId: string) => void;
  resetAllOverrides: () => void;
  isJobFixed: (jobId: string, importDefault: boolean) => boolean;
  setFixedTimeOverride: (jobId: string, fixed: boolean) => void;
  clearAllFixedTimeOverrides: () => void;
  resolvedFixedFlags: Map<string, boolean>;
}

export function useTimingAnalysis(jobs: Job[]): UseTimingAnalysisReturn {
  const [timingEnabled, setTimingEnabled] = useState(false);
  const [durationOverrides, setDurationOverrides] = useState<Map<string, number>>(new Map());
  const baselineRef = useRef<number | null>(null);

  const {
    isJobFixed,
    setFixedTimeOverride,
    clearAllFixedTimeOverrides,
    resolvedFixedFlags,
  } = useFixedTimeOverrides(jobs);

  // Compute fixed start offsets from wall-clock times
  const fixedStartData = useMemo(() => {
    if (!timingEnabled || jobs.length === 0) return { offsets: new Map<string, number>(), referenceTime: '' };
    return computeFixedStartOffsets(jobs, resolvedFixedFlags);
  }, [timingEnabled, jobs, resolvedFixedFlags]);

  const timingResult = useMemo(() => {
    if (!timingEnabled || jobs.length === 0) return null;
    const result = computeTiming(jobs, durationOverrides, fixedStartData.offsets);
    result.referenceTime = fixedStartData.referenceTime;
    return result;
  }, [timingEnabled, jobs, durationOverrides, fixedStartData]);

  // Compute baseline once when timing is enabled (no overrides, but with fixed offsets)
  const baselineDuration = useMemo(() => {
    if (!timingEnabled || jobs.length === 0) return null;
    if (baselineRef.current !== null) return baselineRef.current;
    const baseline = computeTiming(jobs, new Map(), fixedStartData.offsets).totalDuration;
    baselineRef.current = baseline;
    return baseline;
  }, [timingEnabled, jobs, fixedStartData]);

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
    isJobFixed,
    setFixedTimeOverride,
    clearAllFixedTimeOverrides,
    resolvedFixedFlags,
  };
}
