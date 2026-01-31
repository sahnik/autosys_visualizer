interface FilterPanelProps {
  filters: Record<string, boolean>;
  onToggle: (type: string) => void;
}

const JOB_TYPES = [
  { key: 'box', label: 'Box Jobs' },
  { key: 'command', label: 'Commands' },
  { key: 'file_watcher', label: 'File Watchers' },
  { key: 'condition', label: 'Conditions' },
];

export default function FilterPanel({ filters, onToggle }: FilterPanelProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Job Types
      </h3>
      {JOB_TYPES.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100"
        >
          <input
            type="checkbox"
            checked={filters[key] !== false}
            onChange={() => onToggle(key)}
            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          {label}
        </label>
      ))}
    </div>
  );
}
