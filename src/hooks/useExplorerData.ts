import { useState, useCallback, useRef } from 'react';
import type { Job, GhostNode } from '../types';
import type { JobSearchResult } from '../services/dataProvider';
import { sqliteProvider } from '../services/sqliteDataProvider';

export interface UseExplorerDataReturn {
  materializedJobs: Job[];
  ghostNodes: GhostNode[];
  materializedIds: Set<string>;
  seedJobId: string | null;
  totalJobCount: number;
  error: string | null;
  loading: boolean;
  dbOpen: boolean;
  openDatabase: (file: File) => Promise<void>;
  closeDatabase: () => void;
  searchAllJobs: (query: string) => Promise<JobSearchResult[]>;
  setStartingNode: (jobId: string, upLevels: number, downLevels: number) => Promise<void>;
  expandFromNode: (jobId: string, upLevels: number, downLevels: number) => Promise<void>;
  materializeGhost: (ghostId: string) => Promise<void>;
  clearGraph: () => void;
}

export function useExplorerData(): UseExplorerDataReturn {
  const [materializedJobs, setMaterializedJobs] = useState<Job[]>([]);
  const [ghostNodes, setGhostNodes] = useState<GhostNode[]>([]);
  const [materializedIds, setMaterializedIds] = useState<Set<string>>(new Set());
  const [seedJobId, setSeedJobId] = useState<string | null>(null);
  const [totalJobCount, setTotalJobCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbOpen, setDbOpen] = useState(false);

  // Ref mirrors materializedJobs so async callbacks can read current values
  // without a state updater, allowing all awaits to complete before any setState.
  const materializedJobsRef = useRef<Job[]>([]);

  const openDatabase = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      await sqliteProvider.init();
      const buffer = await file.arrayBuffer();
      sqliteProvider.openDatabase(buffer);
      const count = await sqliteProvider.getTotalJobCount();
      materializedJobsRef.current = [];
      setDbOpen(true);
      setTotalJobCount(count);
      setMaterializedJobs([]);
      setGhostNodes([]);
      setMaterializedIds(new Set());
      setSeedJobId(null);
    } catch (e) {
      setError(`Failed to open database: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDatabase = useCallback(() => {
    sqliteProvider.disconnect();
    materializedJobsRef.current = [];
    setDbOpen(false);
    setMaterializedJobs([]);
    setGhostNodes([]);
    setMaterializedIds(new Set());
    setSeedJobId(null);
    setTotalJobCount(0);
    setError(null);
  }, []);

  const searchAllJobs = useCallback(async (query: string): Promise<JobSearchResult[]> => {
    if (!sqliteProvider.isConnected() || !query.trim()) return [];
    try {
      return await sqliteProvider.searchJobs(query);
    } catch {
      return [];
    }
  }, []);

  const setStartingNode = useCallback(async (jobId: string, upLevels: number, downLevels: number) => {
    try {
      setError(null);
      // Complete all async work before setting state
      const jobs = await sqliteProvider.expandLevels(jobId, upLevels, downLevels);
      const ids = new Set(jobs.map((j) => j.id));
      const ghosts = await sqliteProvider.discoverGhosts(ids);
      // Set all state synchronously so React batches into one render
      materializedJobsRef.current = jobs;
      setMaterializedJobs(jobs);
      setMaterializedIds(ids);
      setGhostNodes(ghosts);
      setSeedJobId(jobId);
    } catch (e) {
      setError(`Failed to expand: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const expandFromNode = useCallback(async (jobId: string, upLevels: number, downLevels: number) => {
    try {
      setError(null);
      const newJobs = await sqliteProvider.expandLevels(jobId, upLevels, downLevels);
      // Merge against ref (current value) so we can do all awaits first
      const prev = materializedJobsRef.current;
      const currentIds = new Set(prev.map((j) => j.id));
      const toAdd = newJobs.filter((j) => !currentIds.has(j.id));
      const updated = toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      const updatedIds = new Set(updated.map((j) => j.id));
      const ghosts = await sqliteProvider.discoverGhosts(updatedIds);
      // Set all state synchronously so React batches into one render
      materializedJobsRef.current = updated;
      setMaterializedJobs(updated);
      setMaterializedIds(updatedIds);
      setGhostNodes(ghosts);
    } catch (e) {
      setError(`Failed to expand: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const materializeGhost = useCallback(async (ghostId: string) => {
    try {
      setError(null);
      // Only materialize the ghost itself (0 levels) — its neighbors appear as new ghosts
      const newJobs = await sqliteProvider.expandLevels(ghostId, 0, 0);
      const prev = materializedJobsRef.current;
      const currentIds = new Set(prev.map((j) => j.id));
      const toAdd = newJobs.filter((j) => !currentIds.has(j.id));
      const updated = toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      const updatedIds = new Set(updated.map((j) => j.id));
      const ghosts = await sqliteProvider.discoverGhosts(updatedIds);
      // Set all state synchronously so React batches into one render
      materializedJobsRef.current = updated;
      setMaterializedJobs(updated);
      setMaterializedIds(updatedIds);
      setGhostNodes(ghosts);
    } catch (e) {
      setError(`Failed to materialize: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const clearGraph = useCallback(() => {
    materializedJobsRef.current = [];
    setMaterializedJobs([]);
    setGhostNodes([]);
    setMaterializedIds(new Set());
    setSeedJobId(null);
    setError(null);
  }, []);

  return {
    materializedJobs,
    ghostNodes,
    materializedIds,
    seedJobId,
    totalJobCount,
    error,
    loading,
    dbOpen,
    openDatabase,
    closeDatabase,
    searchAllJobs,
    setStartingNode,
    expandFromNode,
    materializeGhost,
    clearGraph,
  };
}
