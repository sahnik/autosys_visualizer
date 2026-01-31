import { useState, useCallback } from 'react';
import type { Job, JobMetadata } from '../types';
import { validateJobData } from '../utils/validation';

interface UseGraphDataReturn {
  jobs: Job[];
  metadata: JobMetadata | null;
  error: string | null;
  loadFromJson: (json: unknown) => void;
  loadFromFile: (file: File) => Promise<void>;
  loadSampleData: () => Promise<void>;
}

export function useGraphData(): UseGraphDataReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metadata, setMetadata] = useState<JobMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFromJson = useCallback((json: unknown) => {
    const result = validateJobData(json);
    if (!result.data) {
      setError(result.errors.join('\n'));
      return;
    }
    if (result.errors.length > 0) {
      console.warn('Data loaded with warnings:', result.errors);
    }
    setJobs(result.data.jobs);
    setMetadata(result.data.metadata ?? null);
    setError(null);
  }, []);

  const loadFromFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json: unknown = JSON.parse(text);
        loadFromJson(json);
      } catch (e) {
        setError(`Failed to parse file: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [loadFromJson]
  );

  const loadSampleData = useCallback(async () => {
    try {
      const res = await fetch('/sample-data.json');
      const json: unknown = await res.json();
      loadFromJson(json);
    } catch (e) {
      setError(`Failed to load sample data: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [loadFromJson]);

  return { jobs, metadata, error, loadFromJson, loadFromFile, loadSampleData };
}
