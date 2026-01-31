# Autosys Visualizer

Interactive web-based tool for visualizing Autosys batch job workflows as directed acyclic graphs (DAGs). Load job definitions from JSON, explore dependencies, run critical-path timing analysis, and export the graph as PNG or SVG.

## Features

- **Graph visualization** — interactive pan/zoom DAG rendered with Cytoscape.js, with distinct shapes and colours per job type (command, box, file watcher, condition)
- **Multiple layouts** — Dagre (hierarchical), Breadthfirst, and Concentric
- **Search & filter** — find jobs by name; toggle visibility by job type
- **Node selection** — click a node to view full job details (command, schedule, dependencies, tags, tables, custom attributes) in the sidebar; upstream/downstream counts shown in the status bar
- **Timing analysis** — toggle to run a forward-pass critical-path calculation; view earliest start/finish, duration, and total pipeline time; override individual job durations for what-if scenarios
- **Export** — download the full graph as PNG (2x resolution) or SVG with dark background preserved
- **Sample data** — built-in 20-job ETL pipeline demo; or import your own JSON file

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Building for Production

```bash
npm run build
```

This runs TypeScript type-checking (`tsc -b`) then bundles with Vite into the `dist/` directory:

```
dist/
├── index.html            # Single self-contained file (~720 KB, JS+CSS inlined)
└── sample-data.json      # Demo dataset
```

### Stand-alone Build

`npm run build` produces a **single self-contained `dist/index.html`** file (~720 KB) with all JS and CSS inlined via `vite-plugin-singlefile`. No separate asset files, no web server required.

You can:
- **Open `dist/index.html` directly** in a browser from disk (note: the "Load Sample" button uses `fetch`, which some browsers block over `file://` — use the Import button instead, or serve the folder)
- **Serve it with any static server**, e.g. `npx serve dist` or `python3 -m http.server -d dist`
- **Deploy to any static host** (GitHub Pages, S3, Netlify, etc.)
- **Share the single HTML file** — recipients just double-click to open

### Preview the Production Build Locally

```bash
npm run preview
```

Serves the `dist/` output at `http://localhost:4173` for quick verification.

## Input Data Format

Import a JSON file with the following structure:

```json
{
  "metadata": {
    "exportDate": "2025-01-15T10:00:00Z",
    "source": "autosys-prod",
    "version": "1.0"
  },
  "jobs": [
    {
      "id": "unique_job_id",
      "name": "Job Name",
      "type": "command",
      "dependencies": ["other_job_id"],
      "description": "What this job does",
      "machine": "server01",
      "owner": "ops_team",
      "command": "/scripts/run.sh",
      "schedule": "0 2 * * *",
      "avgDurationMinutes": 15,
      "condition": "s(parent_job)",
      "tags": ["etl", "daily"],
      "tablesRead": ["staging.orders"],
      "tablesWritten": ["warehouse.orders"],
      "customAttributes": { "priority": "high" }
    }
  ]
}
```

**Required fields per job:** `id`, `name`, `dependencies` (array, may be empty).
All other fields are optional. The `metadata` object is also optional.

## Tech Stack

| Layer       | Technology                           |
| ----------- | ------------------------------------ |
| UI          | React 18, TypeScript                 |
| Graph       | Cytoscape.js, cytoscape-dagre        |
| Styling     | Tailwind CSS 3                       |
| Build       | Vite 6                               |

## Project Structure

```
src/
├── components/       # React components (App, Header, Sidebar, GraphCanvas, etc.)
├── hooks/            # Custom hooks (useGraphData, useSelection, useTimingAnalysis)
├── utils/            # Pure functions (validation, data transform, graph traversal,
│                     #   timing analysis, export)
├── styles/           # Cytoscape stylesheet
├── types/            # TypeScript interfaces
├── main.tsx          # Entry point
└── index.css         # Tailwind imports
```
