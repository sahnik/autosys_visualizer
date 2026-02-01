import { useState, useCallback, useEffect, useRef } from 'react';
import type { Annotation, AnnotationColor } from '../types';

function computeStorageKey(jobs: { id: string }[]): string {
  if (jobs.length === 0) return '';
  // Use first 10 job IDs to create a stable key for this dataset
  const sample = jobs.slice(0, 10).map((j) => j.id).join('|');
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
  }
  return `annotations_${hash}`;
}

export interface UseAnnotationsReturn {
  annotations: Map<string, Annotation>;
  setAnnotation: (jobId: string, text: string, color: AnnotationColor) => void;
  removeAnnotation: (jobId: string) => void;
  clearAllAnnotations: () => void;
  exportAnnotations: () => string;
  importAnnotations: (json: string) => void;
}

export function useAnnotations(jobs: { id: string }[]): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Map<string, Annotation>>(new Map());
  const storageKeyRef = useRef('');

  // Load from localStorage when jobs change
  useEffect(() => {
    const key = computeStorageKey(jobs);
    storageKeyRef.current = key;
    if (!key) {
      setAnnotations(new Map());
      return;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: Annotation[] = JSON.parse(stored);
        const map = new Map<string, Annotation>();
        for (const a of parsed) {
          map.set(a.jobId, a);
        }
        setAnnotations(map);
      } else {
        setAnnotations(new Map());
      }
    } catch {
      setAnnotations(new Map());
    }
  }, [jobs]);

  // Persist to localStorage whenever annotations change
  useEffect(() => {
    const key = storageKeyRef.current;
    if (!key) return;
    const arr = Array.from(annotations.values());
    if (arr.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(arr));
    }
  }, [annotations]);

  const setAnnotation = useCallback((jobId: string, text: string, color: AnnotationColor) => {
    setAnnotations((prev) => {
      const next = new Map(prev);
      next.set(jobId, { jobId, text: text.slice(0, 80), color });
      return next;
    });
  }, []);

  const removeAnnotation = useCallback((jobId: string) => {
    setAnnotations((prev) => {
      const next = new Map(prev);
      next.delete(jobId);
      return next;
    });
  }, []);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations(new Map());
  }, []);

  const exportAnnotations = useCallback((): string => {
    return JSON.stringify(Array.from(annotations.values()), null, 2);
  }, [annotations]);

  const importAnnotations = useCallback((json: string) => {
    try {
      const parsed: Annotation[] = JSON.parse(json);
      if (!Array.isArray(parsed)) return;
      const map = new Map<string, Annotation>();
      for (const a of parsed) {
        if (a.jobId && a.color) {
          map.set(a.jobId, { jobId: a.jobId, text: (a.text || '').slice(0, 80), color: a.color });
        }
      }
      setAnnotations(map);
    } catch {
      // Invalid JSON, ignore
    }
  }, []);

  return {
    annotations,
    setAnnotation,
    removeAnnotation,
    clearAllAnnotations,
    exportAnnotations,
    importAnnotations,
  };
}
