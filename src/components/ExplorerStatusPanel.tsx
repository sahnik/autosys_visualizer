interface ExplorerStatusPanelProps {
  totalJobCount: number;
  materializedCount: number;
  ghostCount: number;
  onClearGraph: () => void;
  onCloseDatabase: () => void;
}

export default function ExplorerStatusPanel({
  totalJobCount,
  materializedCount,
  ghostCount,
  onClearGraph,
  onCloseDatabase,
}: ExplorerStatusPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Database Explorer
      </h3>

      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Total jobs in DB:</span>
          <span className="text-gray-200">{totalJobCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Materialized:</span>
          <span className="text-gray-200">{materializedCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Ghost nodes:</span>
          <span className="text-gray-200">{ghostCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClearGraph}
          disabled={materializedCount === 0}
          className="flex-1 px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
        >
          Clear Graph
        </button>
        <button
          onClick={onCloseDatabase}
          className="flex-1 px-2 py-1.5 text-xs bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded transition-colors"
        >
          Close DB
        </button>
      </div>
    </div>
  );
}
