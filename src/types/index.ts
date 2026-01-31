export interface JobMetadata {
  exportDate: string;
  source: string;
  version: string;
}

export interface Job {
  id: string;
  name: string;
  description?: string;
  type?: 'box' | 'command' | 'file_watcher' | 'condition';
  machine?: string;
  owner?: string;
  command?: string;
  dependencies: string[];
  condition?: string;
  schedule?: string;
  avgDurationMinutes?: number;
  tablesRead?: string[];
  tablesWritten?: string[];
  tags?: string[];
  customAttributes?: Record<string, string>;
}

export interface JobData {
  metadata?: JobMetadata;
  jobs: Job[];
}

export type LayoutName = 'dagre' | 'breadthfirst' | 'concentric';

export interface AppState {
  jobs: Job[];
  metadata: JobMetadata | null;
  selectedJobId: string | null;
  searchQuery: string;
  layout: LayoutName;
  typeFilters: Record<string, boolean>;
  zoom: number;
}
