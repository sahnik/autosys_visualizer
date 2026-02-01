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
  // Ghost node base style
  {
    selector: 'node.ghost',
    style: {
      'opacity': 0.4,
      'border-style': 'dashed',
      'border-width': 2,
    },
  },
  // Ghost upstream variant (blue-tinted)
  {
    selector: 'node.ghost-upstream',
    style: {
      'border-color': '#60A5FA',
      'background-color': '#1E3A5F',
    },
  },
  // Ghost downstream variant (green-tinted)
  {
    selector: 'node.ghost-downstream',
    style: {
      'border-color': '#34D399',
      'background-color': '#1A3A2A',
    },
  },
  // Ghost edge
  {
    selector: 'edge.ghost-edge',
    style: {
      'line-style': 'dashed',
      'opacity': 0.35,
      'width': 1,
      'line-color': '#4B5563',
      'target-arrow-color': '#4B5563',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.6,
    },
  },
  // Ghost hover (hints clickability)
  {
    selector: 'node.ghost:active',
    style: {
      'opacity': 0.7,
    },
  },
  // --- Annotation note nodes ---
  {
    selector: 'node.note',
    style: {
      'shape': 'tag',
      'width': '120px',
      'height': '28px',
      'font-size': '9px',
      'font-family': 'system-ui, -apple-system, sans-serif',
      'color': '#111827',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'ellipsis',
      'text-max-width': '100px',
      'opacity': 0.85,
      'border-width': 0,
      'label': 'data(label)',
    },
  },
  // Note size classes
  {
    selector: 'node.note-short',
    style: {
      'height': '28px',
    },
  },
  {
    selector: 'node.note-medium',
    style: {
      'height': '42px',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
    },
  },
  {
    selector: 'node.note-long',
    style: {
      'height': '58px',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
    },
  },
  // Note connecting edge
  {
    selector: 'edge.note-edge',
    style: {
      'line-style': 'dotted',
      'width': 1,
      'target-arrow-shape': 'none',
      'opacity': 0.5,
      'curve-style': 'bezier',
    },
  },
  // --- Color variants: note nodes ---
  {
    selector: 'node.note.highlight-yellow',
    style: { 'background-color': '#FBBF24' },
  },
  {
    selector: 'node.note.highlight-cyan',
    style: { 'background-color': '#22D3EE' },
  },
  {
    selector: 'node.note.highlight-pink',
    style: { 'background-color': '#F472B6' },
  },
  {
    selector: 'node.note.highlight-lime',
    style: { 'background-color': '#A3E635' },
  },
  {
    selector: 'node.note.highlight-orange',
    style: { 'background-color': '#FB923C' },
  },
  {
    selector: 'node.note.highlight-violet',
    style: { 'background-color': '#A78BFA' },
  },
  // --- Color variants: annotated job node borders ---
  {
    selector: 'node.annotated.highlight-yellow',
    style: { 'border-color': '#F59E0B', 'border-width': 3 },
  },
  {
    selector: 'node.annotated.highlight-cyan',
    style: { 'border-color': '#06B6D4', 'border-width': 3 },
  },
  {
    selector: 'node.annotated.highlight-pink',
    style: { 'border-color': '#EC4899', 'border-width': 3 },
  },
  {
    selector: 'node.annotated.highlight-lime',
    style: { 'border-color': '#84CC16', 'border-width': 3 },
  },
  {
    selector: 'node.annotated.highlight-orange',
    style: { 'border-color': '#F97316', 'border-width': 3 },
  },
  {
    selector: 'node.annotated.highlight-violet',
    style: { 'border-color': '#8B5CF6', 'border-width': 3 },
  },
  // --- Color variants: note edges ---
  {
    selector: 'edge.note-edge.highlight-yellow',
    style: { 'line-color': '#F59E0B', 'opacity': 0.65 },
  },
  {
    selector: 'edge.note-edge.highlight-cyan',
    style: { 'line-color': '#06B6D4', 'opacity': 0.65 },
  },
  {
    selector: 'edge.note-edge.highlight-pink',
    style: { 'line-color': '#EC4899', 'opacity': 0.65 },
  },
  {
    selector: 'edge.note-edge.highlight-lime',
    style: { 'line-color': '#84CC16', 'opacity': 0.65 },
  },
  {
    selector: 'edge.note-edge.highlight-orange',
    style: { 'line-color': '#F97316', 'opacity': 0.65 },
  },
  {
    selector: 'edge.note-edge.highlight-violet',
    style: { 'line-color': '#8B5CF6', 'opacity': 0.65 },
  },
];
