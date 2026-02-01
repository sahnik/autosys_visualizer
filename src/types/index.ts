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

export type AppMode = 'empty' | 'json' | 'explorer';

export interface GhostNode {
  id: string;
  name: string;
  type?: string;
  direction: 'upstream' | 'downstream';
  connectedTo: string;
}

export type AnnotationColor = 'yellow' | 'cyan' | 'pink' | 'lime' | 'orange' | 'violet';

export interface Annotation {
  jobId: string;
  text: string;
  color: AnnotationColor;
}

export interface AppState {
  jobs: Job[];
  metadata: JobMetadata | null;
  selectedJobId: string | null;
  searchQuery: string;
  layout: LayoutName;
  typeFilters: Record<string, boolean>;
  zoom: number;
}
