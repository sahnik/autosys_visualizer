# Autosys Batch Job Visualizer - Requirements Document

## Project Overview

Build a web-based visualization tool for Autosys batch job dependencies. The tool displays job workflows as an interactive directed acyclic graph (DAG), allowing users to explore dependencies, view job metadata, and perform what-if timing analysis.

**Primary Use Case**: Operations and development teams need to understand complex batch job dependencies, identify critical paths, and analyze the impact of job duration changes on overall workflow completion times.

## Technical Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Graph Library**: Cytoscape.js with react-cytoscapejs wrapper
- **Layout Algorithm**: dagre (for hierarchical DAG layout)
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useReducer, useContext) - no external library needed
- **No backend required** - runs entirely in browser with local JSON data files

## Core Features (Version 1)

### 1. Data Import

- Load job definitions from JSON file(s) via file picker or drag-and-drop
- Support for the data schema defined below
- Validate imported data and display clear error messages for malformed input
- Store loaded data in browser memory (no persistence needed for v1)

### 2. Graph Visualization

- Render jobs as nodes in a hierarchical DAG layout (top-to-bottom flow)
- Show dependency relationships as directed edges (arrows pointing to downstream jobs)
- Must handle 1,000-5,000 nodes with acceptable performance
  - Use Cytoscape's canvas renderer
  - Implement viewport culling if needed (only render visible nodes)
  - Consider node bundling/clustering for very large graphs

### 3. Node Display

- Each node displays:
  - Job name (primary label)
  - Visual indicator of job type (box, condition, file watcher) via shape or icon
  - Color coding by status (optional for v1 - can default to neutral)
- Node size should be consistent but can vary slightly based on importance/duration

### 4. Interactive Features

- **Pan and zoom**: Mouse wheel zoom, click-drag to pan
- **Node selection**: Click to select, highlight selected node and its direct dependencies
- **Hover tooltips**: Display detailed job metadata on hover (see data schema)
- **Search**: Filter/highlight nodes by job name (partial match)
- **Fit to screen**: Button to reset view to show entire graph
- **Zoom to selection**: Double-click node to center and zoom to it

### 5. Dependency Highlighting

When a node is selected:
- Highlight all upstream dependencies (ancestors) in one color
- Highlight all downstream dependents (descendants) in another color
- Dim non-related nodes
- Show the selected node in a distinct highlight color

### 6. Layout Options

- Primary: Hierarchical/DAG layout (dagre)
- Secondary: Option to switch to breadthfirst or concentric layout
- Allow user to manually reposition nodes (positions persist during session)

## Future Features (Version 2+)

### What-If Timing Analysis

- Display job duration on nodes or as edge labels
- Calculate and highlight the critical path (longest path through the DAG)
- Allow users to modify job durations temporarily
- Recalculate critical path and show impact on total workflow time
- Show estimated completion times at each node based on upstream durations

### Enhanced Filtering

- Filter by job type, machine, owner, or custom tags
- Show/hide subtrees
- Collapse groups of related jobs into a single summary node

### Data Lineage View

- Secondary view mode focusing on data flow (tables read/written)
- Color code by source system or data domain

### Export Features

- Export current view as PNG/SVG
- Export filtered job list as CSV
- Share view via URL parameters

## Data Schema

### Input JSON Structure

```json
{
  "metadata": {
    "exportDate": "2025-01-30T10:00:00Z",
    "source": "autosys-prod",
    "version": "1.0"
  },
  "jobs": [
    {
      "id": "JOB_NAME_001",
      "name": "JOB_NAME_001",
      "description": "Daily customer data extract",
      "type": "box" | "command" | "file_watcher" | "condition",
      "machine": "prod-server-01",
      "owner": "batch_ops",
      "command": "/scripts/extract_customers.sh",
      "dependencies": ["UPSTREAM_JOB_001", "UPSTREAM_JOB_002"],
      "condition": "s(UPSTREAM_JOB_001) & s(UPSTREAM_JOB_002)",
      "schedule": "0 2 * * *",
      "avgDurationMinutes": 45,
      "tablesRead": ["CUSTOMER_MASTER", "ACCOUNT_DETAILS"],
      "tablesWritten": ["CUSTOMER_EXTRACT"],
      "tags": ["customer", "daily", "critical"],
      "customAttributes": {
        "priority": "high",
        "sla": "4:00 AM"
      }
    }
  ]
}
```

### Required Fields
- `id`: Unique identifier (string)
- `name`: Display name (string)
- `dependencies`: Array of job IDs this job depends on (can be empty array)

### Optional Fields
All other fields are optional and should display gracefully when missing.

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Autosys Visualizer    [Import] [Layout ▼] [Fit] [?]    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────────────────┐ │
│ │  SIDEBAR        │ │                                         │ │
│ │                 │ │                                         │ │
│ │  [Search...]    │ │           GRAPH CANVAS                  │ │
│ │                 │ │                                         │ │
│ │  Filters:       │ │         (Cytoscape.js)                  │ │
│ │  □ Box jobs     │ │                                         │ │
│ │  □ Commands     │ │                                         │ │
│ │  □ Watchers     │ │                                         │ │
│ │                 │ │                                         │ │
│ │  ─────────────  │ │                                         │ │
│ │                 │ │                                         │ │
│ │  Selected Job:  │ │                                         │ │
│ │  [Details panel │ │                                         │ │
│ │   when node     │ │                                         │ │
│ │   selected]     │ │                                         │ │
│ │                 │ │                                         │ │
│ └─────────────────┘ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Status: 1,234 jobs loaded | 45 selected upstream | Zoom: 75%  │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar (~250-300px wide, collapsible)
- Search input at top
- Filter checkboxes for job types
- Selected job details panel (shows full metadata when node clicked)

### Main Canvas (remaining width)
- Full graph visualization
- Minimap in corner (optional, useful for large graphs)

### Header Bar
- App title/logo
- Import button (opens file picker)
- Layout selector dropdown
- Fit-to-screen button
- Help/info button

### Status Bar
- Job count
- Selection info
- Current zoom level

## Performance Requirements

- Initial render of 1,000 nodes: < 2 seconds
- Initial render of 5,000 nodes: < 5 seconds
- Pan/zoom interactions: 60fps (no perceptible lag)
- Node selection/highlighting: < 100ms response

### Performance Optimization Strategies

1. Use Cytoscape's canvas renderer (not SVG)
2. Implement level-of-detail: simplify node rendering when zoomed out
3. Batch DOM updates
4. Use Web Workers for layout calculation if needed
5. Consider virtualization for the sidebar job list

## Styling Guidelines

- Clean, modern interface (think observability tools like Datadog, Grafana)
- Dark mode preferred (easier on eyes for large graphs), with light mode option
- Node colors:
  - Default: Neutral gray/blue
  - Selected: Bright highlight (yellow/gold)
  - Upstream: Blue shades
  - Downstream: Green shades
  - Dimmed: Low opacity gray
- Edge colors: Subtle gray, highlighted when part of selection path
- Use consistent spacing and typography (Tailwind defaults are fine)

## File Structure

```
autosys-visualizer/
├── public/
│   └── sample-data.json          # Example data for testing
├── src/
│   ├── components/
│   │   ├── App.tsx               # Main app container
│   │   ├── Header.tsx            # Top navigation bar
│   │   ├── Sidebar.tsx           # Left panel with search/filters/details
│   │   ├── GraphCanvas.tsx       # Cytoscape wrapper component
│   │   ├── JobDetails.tsx        # Selected job detail view
│   │   ├── SearchInput.tsx       # Search with autocomplete
│   │   ├── FilterPanel.tsx       # Job type filters
│   │   └── StatusBar.tsx         # Bottom status bar
│   ├── hooks/
│   │   ├── useGraphData.ts       # Data loading and transformation
│   │   ├── useSelection.ts       # Selection state management
│   │   └── useCytoscape.ts       # Cytoscape instance management
│   ├── utils/
│   │   ├── graphUtils.ts         # Graph traversal, path finding
│   │   ├── dataTransform.ts      # JSON to Cytoscape format conversion
│   │   └── validation.ts         # Input data validation
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── styles/
│   │   └── cytoscape.ts          # Cytoscape stylesheet definitions
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Tailwind imports
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Sample Data Generator

Include a utility script or function that generates sample data for testing:
- Configurable number of jobs (100, 1000, 5000)
- Realistic dependency patterns (not fully connected, reasonable fan-in/fan-out)
- Random but plausible metadata values

## Testing Checklist

Before considering complete, verify:

- [ ] Can import JSON file via file picker
- [ ] Graph renders correctly with sample data
- [ ] Pan and zoom work smoothly
- [ ] Clicking node shows details in sidebar
- [ ] Hover shows tooltip with job info
- [ ] Search filters/highlights matching nodes
- [ ] Selecting node highlights upstream/downstream
- [ ] Layout can be changed via dropdown
- [ ] Fit-to-screen works
- [ ] Performance acceptable with 1000+ nodes
- [ ] No console errors
- [ ] Responsive layout (works at different window sizes)

## Getting Started Commands

```bash
# Create project
npm create vite@latest autosys-visualizer -- --template react-ts

# Install dependencies
cd autosys-visualizer
npm install cytoscape react-cytoscapejs cytoscape-dagre
npm install -D @types/cytoscape tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Start development
npm run dev

# Build for production (outputs static files)
npm run build
```

## Notes for Implementation

1. **Start with core graph rendering** - Get Cytoscape displaying nodes and edges first
2. **Add interactivity incrementally** - Selection, then highlighting, then search
3. **Test with large datasets early** - Don't wait until the end to test performance
4. **Keep components focused** - Each component should have a single responsibility
5. **Use TypeScript strictly** - Define interfaces for all data structures upfront

## Questions to Resolve During Development

- Should the sidebar be resizable?
- What's the preferred tooltip library (or use native Cytoscape popper)?
- Should we support multiple files/workflows loaded simultaneously?
- Is there a preferred color palette or should we match existing tools?