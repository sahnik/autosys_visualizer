import { useEffect, useCallback, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Core, EventObject, LayoutOptions } from 'cytoscape';
import type { Job, LayoutName } from '../types';
import type { TimingAnalysis } from '../utils/timingAnalysis';
import { jobsToCytoscapeElements } from '../utils/dataTransform';
import { cytoscapeStylesheet } from '../styles/cytoscape';

// Register dagre layout
dagre(cytoscape);

interface GraphCanvasProps {
  jobs: Job[];
  layout: LayoutName;
  searchQuery: string;
  typeFilters: Record<string, boolean>;
  onNodeSelect: (nodeId: string | null) => void;
  onZoomChange: (zoom: number) => void;
  cyRef: React.MutableRefObject<Core | null>;
  timingEnabled: boolean;
  timingResult: TimingAnalysis | null;
  durationOverrides: Map<string, number>;
}

// Use Record<string, unknown> since dagre adds custom options not in base types
const LAYOUT_OPTIONS: Record<LayoutName, LayoutOptions & Record<string, unknown>> = {
  dagre: {
    name: 'dagre' as const,
    rankDir: 'TB',
    nodeSep: 60,
    rankSep: 80,
    edgeSep: 20,
    animate: false,
  },
  breadthfirst: {
    name: 'breadthfirst' as const,
    directed: true,
    spacingFactor: 1.5,
    animate: false,
  },
  concentric: {
    name: 'concentric' as const,
    minNodeSpacing: 60,
    animate: false,
  },
};

export default function GraphCanvas({
  jobs,
  layout,
  searchQuery,
  typeFilters,
  onNodeSelect,
  onZoomChange,
  cyRef,
  timingEnabled,
  timingResult,
  durationOverrides,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayoutName>(layout);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: cytoscapeStylesheet,
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    cy.on('tap', 'node', (e: EventObject) => {
      onNodeSelect(e.target.id());
    });

    cy.on('tap', (e: EventObject) => {
      if (e.target === cy) {
        onNodeSelect(null);
      }
    });

    cy.on('zoom', () => {
      onZoomChange(cy.zoom());
    });

    // Double-click to zoom to node
    cy.on('dbltap', 'node', (e: EventObject) => {
      cy.animate({
        center: { eles: e.target },
        zoom: 2,
        duration: 300,
      });
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update elements when jobs change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || jobs.length === 0) return;

    const elements = jobsToCytoscapeElements(jobs);
    cy.json({ elements });
    cy.layout(LAYOUT_OPTIONS[layoutRef.current]).run();

    setTimeout(() => {
      cy.fit(undefined, 40);
      onZoomChange(cy.zoom());
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  // Re-layout when layout changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().length === 0) return;
    layoutRef.current = layout;

    cy.layout(LAYOUT_OPTIONS[layout]).run();
    setTimeout(() => {
      cy.fit(undefined, 40);
      onZoomChange(cy.zoom());
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Search highlighting
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass('search-match');

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      cy.nodes().forEach((node) => {
        const label = (node.data('label') as string || '').toLowerCase();
        if (label.includes(query)) {
          node.addClass('search-match');
        }
      });
    }
  }, [searchQuery, cyRef]);

  // Type filtering
  const applyFilters = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().forEach((node) => {
      const type = (node.data('type') as string) || 'box';
      if (typeFilters[type] === false) {
        node.style('display', 'none');
      } else {
        node.style('display', 'element');
      }
    });
  }, [typeFilters, cyRef]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Timing analysis visuals
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const timingClasses = ['timing-active', 'critical-path', 'critical-edge', 'duration-override'];

    if (!timingEnabled || !timingResult) {
      // Remove all timing classes and restore labels
      cy.batch(() => {
        cy.elements().removeClass(timingClasses.join(' '));
        cy.nodes().forEach((node) => {
          node.data('label', node.data('name') as string);
        });
      });
      return;
    }

    const { nodeTiming, criticalPath } = timingResult;
    const criticalSet = new Set(criticalPath);

    // Build set of critical edges
    const criticalEdgeSet = new Set<string>();
    for (let i = 0; i < criticalPath.length - 1; i++) {
      const edgeId = `${criticalPath[i]}->${criticalPath[i + 1]}`;
      criticalEdgeSet.add(edgeId);
    }

    cy.batch(() => {
      // Clear previous timing classes
      cy.elements().removeClass(timingClasses.join(' '));

      cy.nodes().forEach((node) => {
        const id = node.id();
        const timing = nodeTiming.get(id);
        if (!timing) return;

        const dur = timing.effectiveDuration;
        const label = `${node.data('name') as string}\n\u23F1 ${dur}m`;
        node.data('label', label);
        node.addClass('timing-active');

        if (criticalSet.has(id)) {
          node.addClass('critical-path');
        }

        if (durationOverrides.has(id)) {
          node.addClass('duration-override');
        }
      });

      cy.edges().forEach((edge) => {
        if (criticalEdgeSet.has(edge.id())) {
          edge.addClass('critical-edge');
        }
      });
    });
  }, [timingEnabled, timingResult, durationOverrides, cyRef]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-900" />
  );
}
