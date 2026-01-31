import type { CssStyleDeclaration } from 'cytoscape';

type StyleEntry = {
  selector: string;
  style: Partial<CssStyleDeclaration>;
};

export const cytoscapeStylesheet: StyleEntry[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#4B5563',
      'label': 'data(label)',
      'color': '#E5E7EB',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '11px',
      'font-family': 'ui-monospace, monospace',
      'width': '140px',
      'height': '40px',
      'shape': 'roundrectangle',
      'text-wrap': 'ellipsis',
      'text-max-width': '120px',
      'border-width': 1,
      'border-color': '#6B7280',
    },
  },
  {
    selector: 'node[type = "condition"]',
    style: {
      'shape': 'diamond',
      'width': '50px',
      'height': '50px',
      'font-size': '9px',
      'text-max-width': '60px',
    },
  },
  {
    selector: 'node[type = "file_watcher"]',
    style: {
      'shape': 'hexagon',
      'width': '50px',
      'height': '50px',
      'font-size': '9px',
      'text-max-width': '60px',
      'background-color': '#4338CA',
    },
  },
  {
    selector: 'node[type = "command"]',
    style: {
      'background-color': '#1E6A5C',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#4B5563',
      'target-arrow-color': '#4B5563',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
    },
  },
  // Selected node
  {
    selector: 'node.selected',
    style: {
      'background-color': '#F59E0B',
      'border-color': '#FBBF24',
      'border-width': 2,
      'color': '#1F2937',
    },
  },
  // Upstream (ancestors)
  {
    selector: 'node.upstream',
    style: {
      'background-color': '#2563EB',
      'border-color': '#3B82F6',
      'border-width': 2,
    },
  },
  // Downstream (descendants)
  {
    selector: 'node.downstream',
    style: {
      'background-color': '#059669',
      'border-color': '#10B981',
      'border-width': 2,
    },
  },
  // Dimmed (not related)
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.2,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.1,
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'line-color': '#60A5FA',
      'target-arrow-color': '#60A5FA',
      'width': 2.5,
    },
  },
  // Search match
  {
    selector: 'node.search-match',
    style: {
      'border-color': '#F59E0B',
      'border-width': 3,
    },
  },
  // Timing analysis: active nodes show two-line labels
  {
    selector: 'node.timing-active',
    style: {
      'height': '48px',
      'text-wrap': 'wrap',
      'text-max-width': '130px',
    },
  },
  // Critical path node
  {
    selector: 'node.critical-path',
    style: {
      'border-color': '#EF4444',
      'border-width': 3,
      'border-style': 'solid',
    },
  },
  // Critical path edge
  {
    selector: 'edge.critical-edge',
    style: {
      'line-color': '#EF4444',
      'target-arrow-color': '#EF4444',
      'width': 3,
    },
  },
  // Duration override node
  {
    selector: 'node.duration-override',
    style: {
      'border-color': '#8B5CF6',
      'border-width': 3,
      'border-style': 'dashed',
    },
  },
  // Critical path nodes when dimmed (still more visible)
  {
    selector: 'node.critical-path.dimmed',
    style: {
      'opacity': 0.45,
    },
  },
  // Critical path edges when dimmed
  {
    selector: 'edge.critical-edge.dimmed',
    style: {
      'opacity': 0.35,
    },
  },
];
