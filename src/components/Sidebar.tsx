import { useState, useCallback } from 'react';
import type { Job, AppMode, Annotation, AnnotationColor } from '../types';
import type { TimingAnalysis } from '../utils/timingAnalysis';
import SearchInput from './SearchInput';
import FilterPanel from './FilterPanel';
import JobDetails from './JobDetails';
import TimingSummary from './TimingSummary';
import ExplorerStatusPanel from './ExplorerStatusPanel';
import ExplorerSearchInput from './ExplorerSearchInput';
import ExpansionControls from './ExpansionControls';

interface SidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: Record<string, boolean>;
  onFilterToggle: (type: string) => void;
  selectedJob: Job | null;
  timingEnabled: boolean;
  timingResult: TimingAnalysis | null;
  baselineDuration: number | null;
  durationOverrides: Map<string, number>;
  onDurationOverride: (jobId: string, duration: number) => void;
  onClearOverride: (jobId: string) => void;
  onResetAllOverrides: () => void;
  // Explorer mode props
  mode: AppMode;
  totalJobCount?: number;
  materializedCount?: number;
  ghostCount?: number;
  onClearGraph?: () => void;
  onCloseDatabase?: () => void;
  onSearchDatabase?: (query: string) => { id: string; name: string; type?: string }[];
  onSetStartingNode?: (jobId: string, upLevels: number, downLevels: number) => void;
  onExpandFromNode?: (jobId: string, upLevels: number, downLevels: number) => void;
  onMaterializeGhost?: (ghostId: string) => void;
  selectedIsGhost?: boolean;
  annotation?: Annotation;
  onSetAnnotation?: (jobId: string, text: string, color: AnnotationColor) => void;
  onRemoveAnnotation?: (jobId: string) => void;
}

export default function Sidebar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterToggle,
  selectedJob,
  timingEnabled,
  timingResult,
  baselineDuration,
  durationOverrides,
  onDurationOverride,
  onClearOverride,
  onResetAllOverrides,
  mode,
  totalJobCount = 0,
  materializedCount = 0,
  ghostCount = 0,
  onClearGraph,
  onCloseDatabase,
  onSearchDatabase,
  onSetStartingNode,
  onExpandFromNode,
  onMaterializeGhost,
  selectedIsGhost = false,
  annotation,
  onSetAnnotation,
  onRemoveAnnotation,
}: SidebarProps) {
  const selectedTiming = selectedJob && timingResult
    ? timingResult.nodeTiming.get(selectedJob.id) ?? null
    : null;

  const [pendingStartJobId, setPendingStartJobId] = useState<string | null>(null);

  const handleExplorerJobSelect = useCallback((jobId: string) => {
    if (materializedCount === 0) {
      // No graph yet — set as starting node with expansion form
      setPendingStartJobId(jobId);
    } else {
      // Graph exists — expand from this node
      setPendingStartJobId(jobId);
    }
  }, [materializedCount]);

  const handleExpand = useCallback((jobId: string, up: number, down: number) => {
    if (materializedCount === 0 && onSetStartingNode) {
      onSetStartingNode(jobId, up, down);
    } else if (onExpandFromNode) {
      onExpandFromNode(jobId, up, down);
    }
    setPendingStartJobId(null);
  }, [materializedCount, onSetStartingNode, onExpandFromNode]);

  return (
    <aside className="w-72 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1d23' }}
    >
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {mode === 'explorer' && (
          <>
            <ExplorerStatusPanel
              totalJobCount={totalJobCount}
              materializedCount={materializedCount}
              ghostCount={ghostCount}
              onClearGraph={onClearGraph ?? (() => {})}
              onCloseDatabase={onCloseDatabase ?? (() => {})}
            />
            <div className="border-t border-gray-700 pt-3">
              {onSearchDatabase && (
                <ExplorerSearchInput
                  onSearch={onSearchDatabase}
                  onSelectJob={handleExplorerJobSelect}
                />
              )}
            </div>
            {pendingStartJobId && (
              <div className="border-t border-gray-700 pt-3">
                <ExpansionControls
                  jobId={pendingStartJobId}
                  jobName={pendingStartJobId}
                  isGhost={false}
                  onExpand={handleExpand}
                />
              </div>
            )}
            <div className="border-t border-gray-700 pt-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Filter Graph
              </h3>
              <SearchInput value={searchQuery} onChange={onSearchChange} />
            </div>
          </>
        )}

        {mode !== 'explorer' && (
          <SearchInput value={searchQuery} onChange={onSearchChange} />
        )}

        <FilterPanel filters={filters} onToggle={onFilterToggle} />

        <div className="border-t border-gray-700 pt-3">
          <JobDetails
            job={selectedJob}
            timingEnabled={timingEnabled}
            timingResult={selectedTiming}
            durationOverride={selectedJob ? durationOverrides.get(selectedJob.id) : undefined}
            onDurationOverride={onDurationOverride}
            onClearOverride={onClearOverride}
            isGhost={selectedIsGhost}
            onMaterialize={onMaterializeGhost}
            annotation={annotation}
            onSetAnnotation={onSetAnnotation}
            onRemoveAnnotation={onRemoveAnnotation}
          />
        </div>

        {mode === 'explorer' && selectedJob && !selectedIsGhost && onExpandFromNode && (
          <div className="border-t border-gray-700 pt-3">
            <ExpansionControls
              jobId={selectedJob.id}
              jobName={selectedJob.name}
              isGhost={false}
              onExpand={(id, up, down) => onExpandFromNode(id, up, down)}
            />
          </div>
        )}
      </div>

      {timingEnabled && timingResult && (
        <div className="p-3 shrink-0">
          <TimingSummary
            totalDuration={timingResult.totalDuration}
            baselineDuration={baselineDuration}
            criticalPathLength={timingResult.criticalPath.length}
            overrideCount={durationOverrides.size}
            onResetAll={onResetAllOverrides}
          />
        </div>
      )}
    </aside>
  );
}
