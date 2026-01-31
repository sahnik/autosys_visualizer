interface StatusBarProps {
  jobCount: number;
  selectedJobId: string | null;
  upstreamCount: number;
  downstreamCount: number;
  zoom: number;
  timingEnabled: boolean;
  totalDuration: number;
  criticalPathLength: number;
}

export default function StatusBar({
  jobCount,
  selectedJobId,
  upstreamCount,
  downstreamCount,
  zoom,
  timingEnabled,
  totalDuration,
  criticalPathLength,
}: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
      <div className="flex items-center gap-4">
        <span>{jobCount} jobs loaded</span>
        {selectedJobId && (
          <>
            <span className="text-gray-600">|</span>
            <span>
              <span className="text-blue-400">{upstreamCount} upstream</span>
              {' / '}
              <span className="text-green-400">{downstreamCount} downstream</span>
            </span>
          </>
        )}
        {timingEnabled && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-red-400">
              Critical path: {totalDuration}m ({criticalPathLength} jobs)
            </span>
          </>
        )}
      </div>
      <div>Zoom: {Math.round(zoom * 100)}%</div>
    </footer>
  );
}
