interface TimingSummaryProps {
  totalDuration: number;
  baselineDuration: number | null;
  criticalPathLength: number;
  overrideCount: number;
  onResetAll: () => void;
  totalWaitTime?: number;
  fixedJobCount?: number;
  referenceTime?: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimingSummary({
  totalDuration,
  baselineDuration,
  criticalPathLength,
  overrideCount,
  onResetAll,
  totalWaitTime = 0,
  fixedJobCount = 0,
  referenceTime = '',
}: TimingSummaryProps) {
  const delta = baselineDuration != null && overrideCount > 0
    ? totalDuration - baselineDuration
    : null;

  return (
    <div className="border-t border-gray-700 pt-3 space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Timing Analysis
      </h3>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Total Duration:</span>
          <span className="text-gray-200 font-medium">{formatDuration(totalDuration)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Critical Path:</span>
          <span className="text-red-400">{criticalPathLength} jobs</span>
        </div>

        {fixedJobCount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Fixed Jobs:</span>
            <span className="text-amber-400">{fixedJobCount} pinned</span>
          </div>
        )}

        {totalWaitTime > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Wait Time (critical):</span>
            <span className="text-amber-400">{formatDuration(totalWaitTime)} unavoidable</span>
          </div>
        )}

        {referenceTime && (
          <div className="flex justify-between">
            <span className="text-gray-500">Reference (T=0):</span>
            <span className="text-gray-300">{referenceTime}</span>
          </div>
        )}

        {overrideCount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Overrides:</span>
            <span className="text-purple-400">{overrideCount} active</span>
          </div>
        )}

        {delta != null && delta !== 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Delta:</span>
            <span className={delta > 0 ? 'text-red-400' : 'text-green-400'}>
              {delta > 0 ? '+' : ''}{formatDuration(Math.abs(delta))} from baseline
            </span>
          </div>
        )}
      </div>

      {overrideCount > 0 && (
        <button
          onClick={onResetAll}
          className="w-full mt-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors text-gray-300"
        >
          Reset All Overrides
        </button>
      )}
    </div>
  );
}
