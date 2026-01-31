import type cytoscape from 'cytoscape';

export function getUpstream(cy: cytoscape.Core, nodeId: string): string[] {
  const node = cy.getElementById(nodeId);
  if (node.empty()) return [];
  const predecessors = node.predecessors('node');
  return predecessors.map((n) => n.id());
}

export function getDownstream(cy: cytoscape.Core, nodeId: string): string[] {
  const node = cy.getElementById(nodeId);
  if (node.empty()) return [];
  const successors = node.successors('node');
  return successors.map((n) => n.id());
}

export function getConnectedEdges(
  cy: cytoscape.Core,
  nodeId: string
): string[] {
  const node = cy.getElementById(nodeId);
  if (node.empty()) return [];
  const predecessors = node.predecessors('edge');
  const successors = node.successors('edge');
  return [...predecessors.map((e) => e.id()), ...successors.map((e) => e.id())];
}
