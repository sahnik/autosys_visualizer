import type { Core, ElementDefinition } from 'cytoscape';
import type { Annotation, AnnotationColor } from '../types';

export const ANNOTATION_COLORS: {
  id: AnnotationColor;
  bg: string;
  border: string;
}[] = [
  { id: 'yellow', bg: '#FBBF24', border: '#F59E0B' },
  { id: 'cyan', bg: '#22D3EE', border: '#06B6D4' },
  { id: 'pink', bg: '#F472B6', border: '#EC4899' },
  { id: 'lime', bg: '#A3E635', border: '#84CC16' },
  { id: 'orange', bg: '#FB923C', border: '#F97316' },
  { id: 'violet', bg: '#A78BFA', border: '#8B5CF6' },
];

export function getNoteSizeClass(text: string): string {
  if (text.length <= 20) return 'note-short';
  if (text.length <= 45) return 'note-medium';
  return 'note-long';
}

function noteNodeId(jobId: string): string {
  return `note:${jobId}`;
}

function noteEdgeId(jobId: string): string {
  return `note-edge:${jobId}`;
}

/**
 * Sync annotation nodes/edges with the current annotation state.
 * Follows the syncGhostNodes pattern: remove stale, add/update current.
 */
export function syncAnnotationNodes(
  cy: Core,
  annotations: Map<string, Annotation>
): void {
  // Remove all existing note nodes and note edges
  cy.elements('.note').remove();
  cy.elements('.note-edge').remove();

  // Remove annotated classes from all job nodes
  const allColors: AnnotationColor[] = ['yellow', 'cyan', 'pink', 'lime', 'orange', 'violet'];
  const annotatedClasses = ['annotated', ...allColors.map((c) => `highlight-${c}`)].join(' ');
  cy.nodes().removeClass(annotatedClasses);

  if (annotations.size === 0) return;

  const nodesToAdd: ElementDefinition[] = [];
  const edgesToAdd: ElementDefinition[] = [];

  for (const [jobId, annotation] of annotations) {
    const jobNode = cy.getElementById(jobId);
    if (jobNode.empty()) continue;

    // Add highlight classes to the job node
    jobNode.addClass(`annotated highlight-${annotation.color}`);

    // If there's text, create a companion note node
    if (annotation.text) {
      const nId = noteNodeId(jobId);
      const eId = noteEdgeId(jobId);
      const sizeClass = getNoteSizeClass(annotation.text);

      nodesToAdd.push({
        data: {
          id: nId,
          label: annotation.text,
          isNote: true,
          parentJobId: jobId,
        },
        classes: `note highlight-${annotation.color} ${sizeClass}`,
      });

      edgesToAdd.push({
        data: {
          id: eId,
          source: jobId,
          target: nId,
        },
        classes: `note-edge highlight-${annotation.color}`,
      });
    }
  }

  if (nodesToAdd.length > 0) {
    cy.add(nodesToAdd);
  }
  if (edgesToAdd.length > 0) {
    cy.add(edgesToAdd);
  }
}

/**
 * Position note nodes to the right of their parent job nodes.
 * Call after layout runs.
 */
export function positionNoteNodes(cy: Core): void {
  cy.nodes('.note').forEach((noteNode) => {
    const jobId = noteNode.data('parentJobId') as string;
    if (!jobId) return;
    const jobNode = cy.getElementById(jobId);
    if (jobNode.empty()) return;

    const jobPos = jobNode.position();
    noteNode.position({
      x: jobPos.x + 160,
      y: jobPos.y,
    });
  });
}
