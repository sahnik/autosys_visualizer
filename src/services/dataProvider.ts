import type { Job, GhostNode } from '../types';

export interface JobSearchResult {
  id: string;
  name: string;
  type?: string;
}

export interface DataProvider {
  disconnect(): void;
  isConnected(): boolean;
  searchJobs(query: string, limit?: number): Promise<JobSearchResult[]>;
  getJob(id: string): Promise<Job | null>;
  getJobs(ids: string[]): Promise<Job[]>;
  expandLevels(jobId: string, upLevels: number, downLevels: number): Promise<Job[]>;
  discoverGhosts(materializedIds: Set<string>): Promise<GhostNode[]>;
  getTotalJobCount(): Promise<number>;
}
