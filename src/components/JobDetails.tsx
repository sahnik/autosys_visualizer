import { useState } from 'react';
import type { Job, Annotation, AnnotationColor } from '../types';
import type { TimingResult } from '../utils/timingAnalysis';
import { ANNOTATION_COLORS } from '../utils/annotationNodes';

interface JobDetailsProps {
  job: Job | null;
  timingEnabled: boolean;
  timingResult: TimingResult | null;
  durationOverride: number | undefined;
  onDurationOverride: (jobId: string, duration: number) => void;
  onClearOverride: (jobId: string) => void;
  isGhost?: boolean;
  onMaterialize?: (ghostId: string) => void;
  annotation?: Annotation;
  onSetAnnotation?: (jobId: string, text: string, color: AnnotationColor) => void;
  onRemoveAnnotation?: (jobId: string) => void;
}

export default function JobDetails({
  job,
  timingEnabled,
  timingResult,
  durationOverride,
  onDurationOverride,
  onClearOverride,
  isGhost = false,
  onMaterialize,
  annotation,
  onSetAnnotation,
  onRemoveAnnotation,
}: JobDetailsProps) {
  if (!job) {
    return (
      <div className="text-sm text-gray-500 italic">
        Click a node to view details
      </div>
    );
  }

  if (isGhost) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Ghost Node
        </h3>
        <div className="px-3 py-2 bg-blue-900/20 border border-blue-800/40 rounded text-xs text-blue-300">
          Ghost Node — Click to explore
        </div>
        <div>
          <div className="text-sm font-medium text-gray-100 break-all">{job.name}</div>
        </div>
        <div className="space-y-2 text-xs">
          {job.type && <DetailRow label="Type" value={job.type} />}
        </div>
        {onMaterialize && (
          <button
            onClick={() => onMaterialize(job.id)}
            className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            Materialize
          </button>
        )}
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

      {!isGhost && onSetAnnotation && (
        <AnnotationSection
          job={job}
          annotation={annotation}
          onSetAnnotation={onSetAnnotation}
          onRemoveAnnotation={onRemoveAnnotation}
        />
      )}

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

function AnnotationSection({
  job,
  annotation,
  onSetAnnotation,
  onRemoveAnnotation,
}: {
  job: Job;
  annotation?: Annotation;
  onSetAnnotation: (jobId: string, text: string, color: AnnotationColor) => void;
  onRemoveAnnotation?: (jobId: string) => void;
}) {
  const [expanded, setExpanded] = useState(!!annotation);
  const [text, setText] = useState(annotation?.text ?? '');
  const [color, setColor] = useState<AnnotationColor>(annotation?.color ?? 'yellow');

  // Reset form when selected job changes
  const [prevJobId, setPrevJobId] = useState(job.id);
  if (job.id !== prevJobId) {
    setPrevJobId(job.id);
    setText(annotation?.text ?? '');
    setColor(annotation?.color ?? 'yellow');
    setExpanded(!!annotation);
  }

  const handleSave = () => {
    onSetAnnotation(job.id, text, color);
  };

  const handleRemove = () => {
    onRemoveAnnotation?.(job.id);
    setText('');
    setColor('yellow');
    setExpanded(false);
  };

  if (!expanded && !annotation) {
    return (
      <div className="border-t border-gray-700 pt-2 mt-2">
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          + Add Note
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700 pt-2 mt-2 space-y-2">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Annotation</h4>

      <div className="flex gap-1.5">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setColor(c.id)}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c.bg,
              borderColor: color === c.id ? '#FFFFFF' : c.border,
              transform: color === c.id ? 'scale(1.2)' : 'scale(1)',
            }}
            title={c.id}
          />
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 80))}
        maxLength={80}
        rows={2}
        placeholder="Add a note..."
        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 resize-none"
      />
      <div className="text-[10px] text-gray-500 text-right">{text.length}/80</div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          Save
        </button>
        {annotation && (
          <button
            onClick={handleRemove}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Remove
          </button>
        )}
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
