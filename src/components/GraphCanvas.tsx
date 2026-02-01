import { useEffect, useCallback, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Core, EventObject, LayoutOptions } from 'cytoscape';
import type { Job, LayoutName, GhostNode, Annotation } from '../types';
import type { TimingAnalysis } from '../utils/timingAnalysis';
import { jobsToCytoscapeElements } from '../utils/dataTransform';
import { addMaterializedJobs, syncGhostNodes } from '../utils/incrementalGraphUpdate';
import { syncAnnotationNodes, positionNoteNodes } from '../utils/annotationNodes';
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
  ghostNodes?: GhostNode[];
  incrementalMode?: boolean;
  onGhostClick?: (id: string) => void;
  annotations?: Map<string, Annotation>;
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
  ghostNodes = [],
  incrementalMode = false,
  onGhostClick,
  annotations,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LayoutName>(layout);
  const prevJobCountRef = useRef(0);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  // Run layout excluding note nodes, then position notes after
  const runLayout = useCallback((cy: Core, layoutName: LayoutName) => {
    const nonNoteEles = cy.elements().not('.note, .note-edge');
    if (nonNoteEles.nodes().length === 0) return;
    nonNoteEles.layout(LAYOUT_OPTIONS[layoutName]).run();
    setTimeout(() => {
      positionNoteNodes(cy);
    }, 10);
  }, []);

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
      const node = e.target;
      if (node.data('isNote')) return; // Ignore clicks on note nodes
      if (node.data('isGhost') && onGhostClick) {
        onGhostClick(node.id());
      } else {
        onNodeSelect(node.id());
      }
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
    if (!cy) return;

    if (!incrementalMode) {
      // JSON mode: full replace
      if (jobs.length === 0) {
        cy.elements().remove();
        prevJobCountRef.current = 0;
        return;
      }
      const elements = jobsToCytoscapeElements(jobs);
      cy.json({ elements });
      // Re-sync annotations after full replace (cy.json wipes custom nodes)
      if (annotationsRef.current && annotationsRef.current.size > 0) {
        syncAnnotationNodes(cy, annotationsRef.current);
      }
      runLayout(cy, layoutRef.current);
      setTimeout(() => {
        positionNoteNodes(cy);
        cy.fit(undefined, 40);
        onZoomChange(cy.zoom());
      }, 50);
      prevJobCountRef.current = jobs.length;
    } else {
      // Explorer / incremental mode
      if (jobs.length === 0) {
        cy.elements().remove();
        prevJobCountRef.current = 0;
        return;
      }

      const materializedIds = new Set(jobs.map((j) => j.id));
      const isFirstLoad = prevJobCountRef.current === 0;

      if (isFirstLoad) {
        // First load in incremental mode: set all at once
        cy.elements().remove();
      }

      const newIds = addMaterializedJobs(cy, jobs, materializedIds);
      syncGhostNodes(cy, ghostNodes, materializedIds);

      if (isFirstLoad || newIds.length > 0) {
        runLayout(cy, layoutRef.current);
        setTimeout(() => {
          if (newIds.length > 0 && !isFirstLoad) {
            // Animate to newly added elements
            const newEles = cy.collection();
            for (const id of newIds) {
              newEles.merge(cy.getElementById(id));
            }
            if (newEles.length > 0) {
              cy.animate({
                fit: { eles: cy.elements(), padding: 40 },
                duration: 300,
              });
            }
          } else {
            cy.fit(undefined, 40);
          }
          onZoomChange(cy.zoom());
        }, 50);
      }

      prevJobCountRef.current = jobs.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, incrementalMode, ghostNodes]);

  // Re-layout when layout changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().length === 0) return;
    layoutRef.current = layout;

    runLayout(cy, layout);
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

    const hiddenJobIds = new Set<string>();
    cy.nodes().forEach((node) => {
      if (node.data('isNote')) return; // Skip note nodes, handled below
      const type = (node.data('type') as string) || 'box';
      if (typeFilters[type] === false) {
        node.style('display', 'none');
        hiddenJobIds.add(node.id());
      } else {
        node.style('display', 'element');
      }
    });

    // Hide/show note nodes based on their parent job visibility
    cy.nodes('.note').forEach((noteNode) => {
      const parentJobId = noteNode.data('parentJobId') as string;
      noteNode.style('display', hiddenJobIds.has(parentJobId) ? 'none' : 'element');
    });
  }, [typeFilters, cyRef]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Timing analysis visuals
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const timingClasses = ['timing-active', 'critical-path', 'critical-edge', 'duration-override', 'fixed-time', 'has-wait-time'];

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
        let label: string;
        if (timing.isFixed && timing.waitTime > 0) {
          label = `${node.data('name') as string}\n\u{1F4CC} ${dur}m (+${timing.waitTime}m wait)`;
        } else if (timing.isFixed) {
          label = `${node.data('name') as string}\n\u{1F4CC} ${dur}m`;
        } else {
          label = `${node.data('name') as string}\n\u23F1 ${dur}m`;
        }
        node.data('label', label);
        node.addClass('timing-active');

        if (criticalSet.has(id)) {
          node.addClass('critical-path');
        }

        if (durationOverrides.has(id)) {
          node.addClass('duration-override');
        }

        if (timing.isFixed) {
          node.addClass('fixed-time');
        }

        if (timing.waitTime > 0) {
          node.addClass('has-wait-time');
        }
      });

      cy.edges().forEach((edge) => {
        if (criticalEdgeSet.has(edge.id())) {
          edge.addClass('critical-edge');
        }
      });
    });
  }, [timingEnabled, timingResult, durationOverrides, cyRef]);

  // Sync annotation nodes when annotations change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (!annotations) {
      syncAnnotationNodes(cy, new Map());
      return;
    }
    syncAnnotationNodes(cy, annotations);
    positionNoteNodes(cy);
  }, [annotations, cyRef]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-900" />
  );
}
