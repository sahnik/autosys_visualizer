import type { Job } from '../types';
import type { TimingAnalysis } from '../utils/timingAnalysis';
import SearchInput from './SearchInput';
import FilterPanel from './FilterPanel';
import JobDetails from './JobDetails';
import TimingSummary from './TimingSummary';

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
}: SidebarProps) {
  const selectedTiming = selectedJob && timingResult
    ? timingResult.nodeTiming.get(selectedJob.id) ?? null
    : null;

  return (
    <aside className="w-72 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1d23' }}
    >
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        <SearchInput value={searchQuery} onChange={onSearchChange} />
        <FilterPanel filters={filters} onToggle={onFilterToggle} />
        <div className="border-t border-gray-700 pt-3">
          <JobDetails
            job={selectedJob}
            timingEnabled={timingEnabled}
            timingResult={selectedTiming}
            durationOverride={selectedJob ? durationOverrides.get(selectedJob.id) : undefined}
            onDurationOverride={onDurationOverride}
            onClearOverride={onClearOverride}
          />
        </div>
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
