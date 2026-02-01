import { useMemo, useCallback } from 'react';
import type { Job, GhostNode, AppMode } from '../types';
import { useGraphData } from './useGraphData';
import { useExplorerData } from './useExplorerData';

export interface UseAppModeReturn {
  mode: AppMode;
  jobs: Job[];
  ghostNodes: GhostNode[];
  isIncremental: boolean;
  error: string | null;
  loading: boolean;
  // JSON mode
  metadata: ReturnType<typeof useGraphData>['metadata'];
  loadFromFile: (file: File) => Promise<void>;
  loadSampleData: () => void;
  // Explorer mode
  dbOpen: boolean;
  totalJobCount: number;
  materializedCount: number;
  ghostCount: number;
  seedJobId: string | null;
  openDatabase: (file: File) => Promise<void>;
  closeDatabase: () => void;
  searchAllJobs: (query: string) => { id: string; name: string; type?: string }[];
  setStartingNode: (jobId: string, upLevels: number, downLevels: number) => void;
  expandFromNode: (jobId: string, upLevels: number, downLevels: number) => void;
  materializeGhost: (ghostId: string) => void;
  clearGraph: () => void;
}

export function useAppMode(): UseAppModeReturn {
  const json = useGraphData();
  const explorer = useExplorerData();

  const mode: AppMode = useMemo(() => {
    if (explorer.dbOpen) return 'explorer';
    if (json.jobs.length > 0) return 'json';
    return 'empty';
  }, [explorer.dbOpen, json.jobs.length]);

  const jobs: Job[] = mode === 'explorer' ? explorer.materializedJobs : json.jobs;
  const ghostNodes: GhostNode[] = mode === 'explorer' ? explorer.ghostNodes : [];
  const isIncremental = mode === 'explorer';

  const error = mode === 'explorer' ? explorer.error : json.error;
  const loading = explorer.loading;

  // When opening a SQLite file, close any JSON data conceptually (no action needed since
  // mode switches automatically). When importing JSON, close any open DB.
  const loadFromFile = useCallback(async (file: File) => {
    if (explorer.dbOpen) {
      explorer.closeDatabase();
    }
    await json.loadFromFile(file);
  }, [json, explorer]);

  const loadSampleData = useCallback(() => {
    if (explorer.dbOpen) {
      explorer.closeDatabase();
    }
    json.loadSampleData();
  }, [json, explorer]);

  const openDatabase = useCallback(async (file: File) => {
    // Clear JSON data by loading empty - just open the DB
    await explorer.openDatabase(file);
  }, [explorer]);

  return {
    mode,
    jobs,
    ghostNodes,
    isIncremental,
    error,
    loading,
    metadata: json.metadata,
    loadFromFile,
    loadSampleData,
    dbOpen: explorer.dbOpen,
    totalJobCount: explorer.totalJobCount,
    materializedCount: explorer.materializedIds.size,
    ghostCount: explorer.ghostNodes.length,
    seedJobId: explorer.seedJobId,
    openDatabase,
    closeDatabase: explorer.closeDatabase,
    searchAllJobs: explorer.searchAllJobs,
    setStartingNode: explorer.setStartingNode,
    expandFromNode: explorer.expandFromNode,
    materializeGhost: explorer.materializeGhost,
    clearGraph: explorer.clearGraph,
  };
}
