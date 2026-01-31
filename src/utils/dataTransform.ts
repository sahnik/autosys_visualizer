import type { Job } from '../types';
import type { ElementDefinition } from 'cytoscape';

export function jobsToCytoscapeElements(jobs: Job[]): ElementDefinition[] {
  const jobIds = new Set(jobs.map((j) => j.id));
  const elements: ElementDefinition[] = [];

  for (const job of jobs) {
    elements.push({
      data: {
        ...job,
        label: job.name,
        type: job.type ?? 'box',
      },
    });

    for (const dep of job.dependencies) {
      if (jobIds.has(dep)) {
        elements.push({
          data: {
            id: `${dep}->${job.id}`,
            source: dep,
            target: job.id,
          },
        });
      }
    }
  }

  return elements;
}
