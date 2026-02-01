import type { Core, ElementDefinition } from 'cytoscape';
import type { Job, GhostNode } from '../types';

export function jobToNodeElement(job: Job): ElementDefinition {
  return {
    data: {
      ...job,
      id: job.id,
      label: job.name,
      type: job.type ?? 'box',
    },
  };
}

export function createEdgesForJob(job: Job, allMaterializedIds: Set<string>): ElementDefinition[] {
  const edges: ElementDefinition[] = [];
  for (const dep of job.dependencies) {
    if (allMaterializedIds.has(dep)) {
      const edgeId = `${dep}->${job.id}`;
      edges.push({
        data: { id: edgeId, source: dep, target: job.id },
      });
    }
  }
  return edges;
}

/**
 * Add new materialized jobs to the graph incrementally.
 * Returns array of newly added node IDs.
 */
export function addMaterializedJobs(
  cy: Core,
  newJobs: Job[],
  allMaterializedIds: Set<string>
): string[] {
  const addedIds: string[] = [];
  const elementsToAdd: ElementDefinition[] = [];

  for (const job of newJobs) {
    const existing = cy.getElementById(job.id);
    if (!existing.empty()) {
      // If the existing node is a ghost, remove it so we re-add as materialized
      if (existing.hasClass('ghost')) {
        existing.connectedEdges().remove();
        existing.remove();
      } else {
        continue; // Already materialized, skip
      }
    }

    elementsToAdd.push(jobToNodeElement(job));
    addedIds.push(job.id);
  }

  // Create edges: new→existing and existing→new
  for (const job of newJobs) {
    // Edges where this job depends on others (dep -> job)
    for (const dep of job.dependencies) {
      if (allMaterializedIds.has(dep)) {
        const edgeId = `${dep}->${job.id}`;
        if (cy.getElementById(edgeId).empty()) {
          elementsToAdd.push({
            data: { id: edgeId, source: dep, target: job.id },
          });
        }
      }
    }
  }

  // Also create edges from existing nodes that depend on newly added ones
  const newIdSet = new Set(addedIds);
  cy.nodes().forEach((node) => {
    const deps = node.data('dependencies') as string[] | undefined;
    if (!deps) return;
    for (const dep of deps) {
      if (newIdSet.has(dep)) {
        const edgeId = `${dep}->${node.id()}`;
        if (cy.getElementById(edgeId).empty()) {
          elementsToAdd.push({
            data: { id: edgeId, source: dep, target: node.id() },
          });
        }
      }
    }
  });

  if (elementsToAdd.length > 0) {
    cy.add(elementsToAdd);
  }

  return addedIds;
}

/**
 * Sync ghost nodes: remove stale ghosts, add new ones.
 */
export function syncGhostNodes(
  cy: Core,
  ghostNodes: GhostNode[],
  materializedIds: Set<string>
): void {
  // Remove all existing ghost nodes and ghost edges
  cy.elements('.ghost').remove();
  cy.elements('.ghost-edge').remove();

  if (ghostNodes.length === 0) return;

  // Deduplicate ghosts by ID (a ghost may connect to multiple materialized nodes)
  const ghostMap = new Map<string, GhostNode>();
  const ghostEdges: ElementDefinition[] = [];

  for (const ghost of ghostNodes) {
    // Skip if this ghost ID is actually materialized
    if (materializedIds.has(ghost.id)) continue;

    if (!ghostMap.has(ghost.id)) {
      ghostMap.set(ghost.id, ghost);
    }

    // Only create edge if the connected materialized node actually exists in the graph
    const connectedExists = !cy.getElementById(ghost.connectedTo).empty();
    if (!connectedExists) continue;

    const edgeId = ghost.direction === 'upstream'
      ? `ghost:${ghost.id}->${ghost.connectedTo}`
      : `ghost:${ghost.connectedTo}->${ghost.id}`;

    ghostEdges.push({
      data: {
        id: edgeId,
        source: ghost.direction === 'upstream' ? ghost.id : ghost.connectedTo,
        target: ghost.direction === 'upstream' ? ghost.connectedTo : ghost.id,
      },
      classes: 'ghost-edge',
    });
  }

  const elementsToAdd: ElementDefinition[] = [];

  // Add ghost nodes first, then edges (Cytoscape needs nodes to exist for edge endpoints)
  for (const [, ghost] of ghostMap) {
    elementsToAdd.push({
      data: {
        id: ghost.id,
        label: ghost.name,
        type: ghost.type ?? 'box',
        isGhost: true,
        ghostDirection: ghost.direction,
        name: ghost.name,
      },
      classes: `ghost ghost-${ghost.direction}`,
    });
  }

  // Add nodes first
  if (elementsToAdd.length > 0) {
    cy.add(elementsToAdd);
  }

  // Then add edges separately so all node endpoints exist
  if (ghostEdges.length > 0) {
    cy.add(ghostEdges);
  }
}
