import { useState } from 'react';
import type { Job } from '../types';
import type { TimingResult } from '../utils/timingAnalysis';

interface JobDetailsProps {
  job: Job | null;
  timingEnabled: boolean;
  timingResult: TimingResult | null;
  durationOverride: number | undefined;
  onDurationOverride: (jobId: string, duration: number) => void;
  onClearOverride: (jobId: string) => void;
}

export default function JobDetails({
  job,
  timingEnabled,
  timingResult,
  durationOverride,
  onDurationOverride,
  onClearOverride,
}: JobDetailsProps) {
  if (!job) {
    return (
      <div className="text-sm text-gray-500 italic">
        Click a node to view details
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Selected Job
      </h3>

      <div>
        <div className="text-sm font-medium text-gray-100 break-all">{job.name}</div>
        {job.description && (
          <div className="text-xs text-gray-400 mt-1">{job.description}</div>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {job.type && (
          <DetailRow label="Type" value={job.type} />
        )}
        {job.machine && (
          <DetailRow label="Machine" value={job.machine} />
        )}
        {job.owner && (
          <DetailRow label="Owner" value={job.owner} />
        )}
        {job.schedule && (
          <DetailRow label="Schedule" value={job.schedule} />
        )}
        {job.avgDurationMinutes != null && (
          <DetailRow label="Avg Duration" value={`${job.avgDurationMinutes} min`} />
        )}
        {job.command && (
          <DetailRow label="Command" value={job.command} />
        )}
        {job.condition && (
          <DetailRow label="Condition" value={job.condition} />
        )}
        {job.dependencies.length > 0 && (
          <div>
            <span className="text-gray-500">Dependencies:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {job.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}
        {job.tags && job.tags.length > 0 && (
          <div>
            <span className="text-gray-500">Tags:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {job.tablesRead && job.tablesRead.length > 0 && (
          <div>
            <span className="text-gray-500">Tables Read:</span>
            <div className="mt-1 text-gray-300">{job.tablesRead.join(', ')}</div>
          </div>
        )}
        {job.tablesWritten && job.tablesWritten.length > 0 && (
          <div>
            <span className="text-gray-500">Tables Written:</span>
            <div className="mt-1 text-gray-300">{job.tablesWritten.join(', ')}</div>
          </div>
        )}
      </div>

      {timingEnabled && timingResult && (
        <TimingSection
          job={job}
          timing={timingResult}
          durationOverride={durationOverride}
          onDurationOverride={onDurationOverride}
          onClearOverride={onClearOverride}
        />
      )}
    </div>
  );
}

function TimingSection({
  job,
  timing,
  durationOverride,
  onDurationOverride,
  onClearOverride,
}: {
  job: Job;
  timing: TimingResult;
  durationOverride: number | undefined;
  onDurationOverride: (jobId: string, duration: number) => void;
  onClearOverride: (jobId: string) => void;
}) {
  const originalDuration = job.avgDurationMinutes ?? 0;
  const [inputValue, setInputValue] = useState(
    String(durationOverride ?? originalDuration)
  );

  const commitValue = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      if (parsed === originalDuration) {
        onClearOverride(job.id);
      } else {
        onDurationOverride(job.id, parsed);
      }
    } else {
      setInputValue(String(durationOverride ?? originalDuration));
    }
  };

  return (
    <div className="border-t border-gray-700 pt-2 mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timing</h4>
        {timing.isCritical ? (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-900/50 text-red-300 rounded">
            Critical
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-700 text-gray-400 rounded">
            Not critical
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 shrink-0">Duration (min):</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={commitValue}
              onKeyDown={(e) => { if (e.key === 'Enter') commitValue(); }}
              className="w-16 px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-gray-200 text-right text-xs"
            />
            {durationOverride != null && (
              <button
                onClick={() => {
                  onClearOverride(job.id);
                  setInputValue(String(originalDuration));
                }}
                className="text-gray-500 hover:text-gray-300 text-xs"
                title={`Reset to ${originalDuration}`}
              >
                &#x21A9;
              </button>
            )}
          </div>
        </div>

        {durationOverride != null && (
          <div className="text-[10px] text-purple-400">
            Original: {originalDuration}m
          </div>
        )}

        <DetailRow label="Earliest Start" value={`${timing.earliestStart}m from start`} />
        <DetailRow label="Earliest Finish" value={`${timing.earliestFinish}m from start`} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-300 text-right break-all">{value}</span>
    </div>
  );
}
