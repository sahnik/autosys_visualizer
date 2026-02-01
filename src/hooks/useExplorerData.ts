import { useState, useCallback } from 'react';
import type { Job, GhostNode } from '../types';
import { sqliteService } from '../services/sqliteService';

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
  searchAllJobs: (query: string) => { id: string; name: string; type?: string }[];
  setStartingNode: (jobId: string, upLevels: number, downLevels: number) => void;
  expandFromNode: (jobId: string, upLevels: number, downLevels: number) => void;
  materializeGhost: (ghostId: string) => void;
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

  const openDatabase = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      await sqliteService.init();
      const buffer = await file.arrayBuffer();
      sqliteService.openDatabase(buffer);
      setDbOpen(true);
      setTotalJobCount(sqliteService.getTotalJobCount());
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
    sqliteService.closeDatabase();
    setDbOpen(false);
    setMaterializedJobs([]);
    setGhostNodes([]);
    setMaterializedIds(new Set());
    setSeedJobId(null);
    setTotalJobCount(0);
    setError(null);
  }, []);

  const searchAllJobs = useCallback((query: string) => {
    if (!sqliteService.isOpen() || !query.trim()) return [];
    try {
      return sqliteService.searchJobs(query);
    } catch {
      return [];
    }
  }, []);

  const mergeIds = useCallback((existingIds: Set<string>, newJobs: Job[]) => {
    const updatedIds = new Set(existingIds);
    for (const job of newJobs) {
      updatedIds.add(job.id);
    }
    return updatedIds;
  }, []);

  const setStartingNode = useCallback((jobId: string, upLevels: number, downLevels: number) => {
    try {
      setError(null);
      const jobs = sqliteService.expandLevels(jobId, upLevels, downLevels);
      const ids = new Set(jobs.map((j) => j.id));
      const ghosts = sqliteService.discoverGhosts(ids);
      setMaterializedJobs(jobs);
      setMaterializedIds(ids);
      setGhostNodes(ghosts);
      setSeedJobId(jobId);
    } catch (e) {
      setError(`Failed to expand: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const expandFromNode = useCallback((jobId: string, upLevels: number, downLevels: number) => {
    try {
      setError(null);
      const newJobs = sqliteService.expandLevels(jobId, upLevels, downLevels);
      setMaterializedJobs((prev) => {
        const currentIds = new Set(prev.map((j) => j.id));
        const toAdd = newJobs.filter((j) => !currentIds.has(j.id));
        const updated = toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        const updatedIds = mergeIds(currentIds, toAdd);
        setMaterializedIds(updatedIds);
        const ghosts = sqliteService.discoverGhosts(updatedIds);
        setGhostNodes(ghosts);
        return updated;
      });
    } catch (e) {
      setError(`Failed to expand: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [mergeIds]);

  const materializeGhost = useCallback((ghostId: string) => {
    try {
      setError(null);
      // Only materialize the ghost itself (0 levels) — its neighbors appear as new ghosts
      const newJobs = sqliteService.expandLevels(ghostId, 0, 0);
      setMaterializedJobs((prev) => {
        const currentIds = new Set(prev.map((j) => j.id));
        const toAdd = newJobs.filter((j) => !currentIds.has(j.id));
        const updated = toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        const updatedIds = new Set(updated.map((j) => j.id));
        setMaterializedIds(updatedIds);
        const ghosts = sqliteService.discoverGhosts(updatedIds);
        setGhostNodes(ghosts);
        return updated;
      });
    } catch (e) {
      setError(`Failed to materialize: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const clearGraph = useCallback(() => {
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
