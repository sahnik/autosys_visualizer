import type { Job } from '../types';

interface JobDetailsProps {
  job: Job | null;
}

export default function JobDetails({ job }: JobDetailsProps) {
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
