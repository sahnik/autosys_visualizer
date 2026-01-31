import type { Job, JobMetadata } from '../types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: { metadata: JobMetadata | null; jobs: Job[] } | null;
}

export function validateJobData(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Input must be a JSON object'], data: null };
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.jobs)) {
    return {
      valid: false,
      errors: ['Missing or invalid "jobs" array'],
      data: null,
    };
  }

  const jobs: Job[] = [];
  const ids = new Set<string>();

  for (let i = 0; i < obj.jobs.length; i++) {
    const job = obj.jobs[i] as Record<string, unknown>;

    if (!job.id || typeof job.id !== 'string') {
      errors.push(`Job at index ${i}: missing or invalid "id"`);
      continue;
    }

    if (ids.has(job.id)) {
      errors.push(`Duplicate job ID: "${job.id}"`);
      continue;
    }

    if (!job.name || typeof job.name !== 'string') {
      errors.push(`Job "${job.id}": missing or invalid "name"`);
      continue;
    }

    if (!Array.isArray(job.dependencies)) {
      errors.push(`Job "${job.id}": "dependencies" must be an array`);
      continue;
    }

    ids.add(job.id);
    jobs.push(job as unknown as Job);
  }

  if (jobs.length === 0 && errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  const metadata = (obj.metadata as JobMetadata) ?? null;

  return {
    valid: errors.length === 0,
    errors,
    data: { metadata, jobs },
  };
}
