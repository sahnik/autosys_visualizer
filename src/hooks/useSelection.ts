import { useState, useCallback, useRef } from 'react';
import type cytoscape from 'cytoscape';
import { getUpstream, getDownstream, getConnectedEdges } from '../utils/graphUtils';

interface UseSelectionReturn {
  selectedJobId: string | null;
  selectNode: (nodeId: string | null) => void;
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
}

export function useSelection(): UseSelectionReturn {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const selectNode = useCallback((nodeId: string | null) => {
    const cy = cyRef.current;
    if (!cy) return;

    // Clear all highlighting classes
    cy.elements().removeClass('selected upstream downstream dimmed highlighted');

    if (!nodeId) {
      setSelectedJobId(null);
      return;
    }

    setSelectedJobId(nodeId);

    const upstream = getUpstream(cy, nodeId);
    const downstream = getDownstream(cy, nodeId);
    const connectedEdgeIds = getConnectedEdges(cy, nodeId);
    const relatedIds = new Set([nodeId, ...upstream, ...downstream]);

    // Dim all unrelated nodes
    cy.nodes().forEach((node) => {
      const nodeId2 = node.id();
      if (relatedIds.has(nodeId2)) return;
      // Note nodes follow their parent job's dimming state
      if (node.data('isNote')) {
        const parentJobId = node.data('parentJobId') as string;
        if (parentJobId && relatedIds.has(parentJobId)) return;
      }
      node.addClass('dimmed');
    });

    // Dim unrelated edges, highlight related
    cy.edges().forEach((edge) => {
      if (connectedEdgeIds.includes(edge.id())) {
        edge.addClass('highlighted');
      } else if (edge.hasClass('note-edge')) {
        // Note edges follow their source job's dimming state
        const sourceId = edge.data('source') as string;
        if (!relatedIds.has(sourceId)) {
          edge.addClass('dimmed');
        }
      } else {
        edge.addClass('dimmed');
      }
    });

    // Apply highlight classes
    cy.getElementById(nodeId).addClass('selected');
    upstream.forEach((id) => cy.getElementById(id).addClass('upstream'));
    downstream.forEach((id) => cy.getElementById(id).addClass('downstream'));
  }, []);

  return { selectedJobId, selectNode, cyRef };
}
