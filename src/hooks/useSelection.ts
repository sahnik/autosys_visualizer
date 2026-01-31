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
      if (!relatedIds.has(node.id())) {
        node.addClass('dimmed');
      }
    });

    // Dim unrelated edges, highlight related
    cy.edges().forEach((edge) => {
      if (connectedEdgeIds.includes(edge.id())) {
        edge.addClass('highlighted');
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
