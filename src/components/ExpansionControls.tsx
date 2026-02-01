import { useState } from 'react';

interface ExpansionControlsProps {
  jobId: string;
  jobName: string;
  isGhost: boolean;
  onExpand: (jobId: string, upLevels: number, downLevels: number) => void;
  onMaterialize?: (ghostId: string) => void;
}

export default function ExpansionControls({
  jobId,
  jobName,
  isGhost,
  onExpand,
  onMaterialize,
}: ExpansionControlsProps) {
  const [upLevels, setUpLevels] = useState(1);
  const [downLevels, setDownLevels] = useState(1);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Expand from Node
      </h3>
      <div className="text-xs text-gray-300 truncate" title={jobName}>
        {jobName}
      </div>

      {isGhost && onMaterialize && (
        <button
          onClick={() => onMaterialize(jobId)}
          className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Materialize Ghost
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Upstream</label>
          <input
            type="number"
            min={0}
            max={10}
            value={upLevels}
            onChange={(e) => setUpLevels(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 text-center"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Downstream</label>
          <input
            type="number"
            min={0}
            max={10}
            value={downLevels}
            onChange={(e) => setDownLevels(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 text-center"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onExpand(jobId, upLevels, downLevels)}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Expand
        </button>
        <button
          onClick={() => onExpand(jobId, 1, 1)}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Expand 1 level in each direction"
        >
          All Neighbors
        </button>
      </div>
    </div>
  );
}
