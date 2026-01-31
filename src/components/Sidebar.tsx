import type { Job } from '../types';
import SearchInput from './SearchInput';
import FilterPanel from './FilterPanel';
import JobDetails from './JobDetails';

interface SidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: Record<string, boolean>;
  onFilterToggle: (type: string) => void;
  selectedJob: Job | null;
}

export default function Sidebar({
  searchQuery,
  onSearchChange,
  filters,
  onFilterToggle,
  selectedJob,
}: SidebarProps) {
  return (
    <aside className="w-72 shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1d23' }}
    >
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        <SearchInput value={searchQuery} onChange={onSearchChange} />
        <FilterPanel filters={filters} onToggle={onFilterToggle} />
        <div className="border-t border-gray-700 pt-3">
          <JobDetails job={selectedJob} />
        </div>
      </div>
    </aside>
  );
}
