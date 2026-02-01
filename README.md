# Autosys Visualizer

Interactive web-based tool for visualizing Autosys batch job workflows as directed acyclic graphs (DAGs). Load job definitions from JSON or explore a SQLite database interactively, run critical-path timing analysis, and export the graph as PNG or SVG.

## Features

- **Graph visualization** — interactive pan/zoom DAG rendered with Cytoscape.js, with distinct shapes and colours per job type (command, box, file watcher, condition)
- **Multiple layouts** — Dagre (hierarchical), Breadthfirst, and Concentric
- **Search & filter** — find jobs by name; toggle visibility by job type
- **Node selection** — click a node to view full job details (command, schedule, dependencies, tags, tables, custom attributes) in the sidebar; upstream/downstream counts shown in the status bar
- **Timing analysis** — toggle to run a forward-pass critical-path calculation; view earliest start/finish, duration, and total pipeline time; override individual job durations for what-if scenarios
- **Fixed-time jobs** — mark jobs with wall-clock scheduling constraints as "fixed in time"; the critical path analysis accounts for unavoidable wait time when a job can't start until its fixed time regardless of upstream completion; amber visual indicators on graph nodes and sidebar details
- **Export** — download the full graph as PNG (2x resolution) or SVG with dark background preserved
- **Sample data** — built-in ETL pipeline demo with wall-clock times and fixed-time jobs; or import your own JSON file
- **Database explorer** — open a SQLite file, search thousands of jobs by name, expand N levels upstream/downstream, and progressively explore the graph via ghost nodes at the frontier

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
├── index.html            # Single self-contained file (~1.6 MB, JS+CSS+WASM inlined)
└── sample-data.json      # Demo dataset
```

### Stand-alone Build

`npm run build` produces a **single self-contained `dist/index.html`** file (~1.6 MB) with all JS, CSS, and the sql.js WASM binary inlined via `vite-plugin-singlefile`. No separate asset files, no web server required, fully offline.

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

## Input Data

### JSON Import

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
      "lastRunStart": "02:15",
      "lastRunEnd": "02:30",
      "fixedStartTime": true,
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

**Fixed-time fields:** `lastRunStart` and `lastRunEnd` are `"HH:MM"` wall-clock times from the last job run. Set `fixedStartTime: true` to mark a job as pinned to its `lastRunStart` time — the critical path analysis will treat this as a scheduling floor that cannot be optimized away.

### SQLite Database (Explorer Mode)

Click **Open Database** and select a `.sqlite` or `.db` file. The database must contain two tables:

#### `jobs` table

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | TEXT | PK | Unique job identifier (e.g. `PROD_ETL_LOAD_ORDERS`). Map from Autosys `job_name`. |
| `name` | TEXT | NOT NULL | Display name. Can be the same as `id` or a friendlier label. |
| `description` | TEXT | | Free-text description of the job. |
| `type` | TEXT | | One of `box`, `command`, `file_watcher`, `condition`. Maps from Autosys `job_type`. |
| `machine` | TEXT | | Target machine. Maps from Autosys `machine`. |
| `owner` | TEXT | | Job owner. Maps from Autosys `owner`. |
| `command` | TEXT | | Shell command or script path. Maps from Autosys `command`. |
| `condition_expr` | TEXT | | Autosys condition expression, e.g. `s(JOB_A) & s(JOB_B)`. Maps from `condition`. |
| `schedule` | TEXT | | Cron expression or Autosys `start_times` / `date_conditions`. |
| `avg_duration_minutes` | REAL | | Average runtime in minutes. Compute from run history if available. |
| `tags` | TEXT | | JSON array of strings, e.g. `["etl", "daily"]`. |
| `tables_read` | TEXT | | JSON array of table names this job reads from. |
| `tables_written` | TEXT | | JSON array of table names this job writes to. |
| `custom_attributes` | TEXT | | JSON object of arbitrary key-value pairs. |
| `last_run_start` | TEXT | | Wall-clock start time of last run in `HH:MM` format (e.g. `"03:15"`). Used for fixed-time analysis. |
| `last_run_end` | TEXT | | Wall-clock end time of last run in `HH:MM` format. |
| `fixed_start_time` | INTEGER | | `1` if this job has a fixed scheduling constraint (pinned to `last_run_start`). |

#### `job_dependencies` table

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `job_id` | TEXT | PK | The job that depends on another. |
| `depends_on` | TEXT | PK | The upstream job it depends on. |

The composite primary key is `(job_id, depends_on)`.

#### DDL

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT,
  machine TEXT,
  owner TEXT,
  command TEXT,
  condition_expr TEXT,
  schedule TEXT,
  avg_duration_minutes REAL,
  tags TEXT,
  tables_read TEXT,
  tables_written TEXT,
  custom_attributes TEXT,
  last_run_start TEXT,
  last_run_end TEXT,
  fixed_start_time INTEGER
);

CREATE TABLE job_dependencies (
  job_id TEXT NOT NULL,
  depends_on TEXT NOT NULL,
  PRIMARY KEY (job_id, depends_on)
);
```

#### Exporting from Oracle / Autosys

A typical extraction approach:

1. **Export jobs** — query the Autosys metadata tables (or use `autorep -J ALL -q`) and insert into the `jobs` table. Map fields as noted above. For `tags`, `tables_read`, `tables_written`, and `custom_attributes`, format values as JSON strings.

2. **Export dependencies** — parse the `condition` field of each job to extract referenced job names. For example, `s(JOB_A) & s(JOB_B)` means this job depends on `JOB_A` and `JOB_B`. Insert one row per dependency into `job_dependencies`. Box-child relationships (jobs inside a box) should also be represented as dependencies.

3. **Compute durations** — optionally query run history to compute `avg_duration_minutes` per job for timing analysis.

4. **Last run times** — optionally populate `last_run_start` and `last_run_end` with `HH:MM` wall-clock times from the most recent run. Set `fixed_start_time = 1` for jobs with hard scheduling constraints (e.g. regulatory windows, external data availability) to enable fixed-time critical path analysis.

Example extraction sketch (adjust for your environment):

```sql
-- Create the SQLite file using Python, DBeaver, or any SQLite tool.
-- Then populate from Oracle:

-- Jobs (pseudo-SQL, adapt to your Autosys schema)
INSERT INTO jobs (id, name, type, machine, owner, command, condition_expr, schedule)
SELECT job_name, job_name, job_type, machine, owner, command, condition, start_times
FROM autosys_metadata.job_definition;

-- Dependencies (parse conditions)
-- For each job with a condition like 's(JOB_A) & s(JOB_B)',
-- extract JOB_A and JOB_B and insert:
INSERT INTO job_dependencies (job_id, depends_on) VALUES ('THIS_JOB', 'JOB_A');
INSERT INTO job_dependencies (job_id, depends_on) VALUES ('THIS_JOB', 'JOB_B');
```

A Python script using `cx_Oracle` and `sqlite3` works well for this — query Oracle, parse conditions with a regex like `s\((\w+)\)`, and write directly to a SQLite file.

## Database Explorer Usage

1. Click **Open Database** in the header and select your `.sqlite` file
2. The sidebar shows the total job count and a **Search Database** typeahead
3. Type a job name — select one from the dropdown results
4. Set upstream/downstream expansion levels (0–10) and click **Expand**
5. The graph populates with the subgraph; semi-transparent **ghost nodes** appear at the frontier showing unmaterialized neighbors
6. Click a ghost node to materialize it — its neighbors then appear as new ghosts
7. Select any materialized node to see full details and expand further from it
8. **Clear Graph** resets the view but keeps the database open; **Close DB** returns to the empty state
9. All existing features (search/filter the visible graph, timing analysis, PNG/SVG export) work on the explored subgraph

## Tech Stack

| Layer       | Technology                           |
| ----------- | ------------------------------------ |
| UI          | React 18, TypeScript                 |
| Graph       | Cytoscape.js, cytoscape-dagre        |
| SQLite      | sql.js (SQLite compiled to WASM)     |
| Styling     | Tailwind CSS 3                       |
| Build       | Vite 6                               |

## Project Structure

```
src/
├── components/       # React components (App, Header, Sidebar, GraphCanvas,
│                     #   ExplorerSearchInput, ExpansionControls, ExplorerStatusPanel, etc.)
├── hooks/            # Custom hooks (useAppMode, useExplorerData, useGraphData,
│                     #   useSelection, useTimingAnalysis, useFixedTimeOverrides)
├── services/         # SQLite service (database abstraction layer)
├── utils/            # Pure functions (validation, data transform, graph traversal,
│                     #   timing analysis, incremental graph update, export)
├── styles/           # Cytoscape stylesheet
├── types/            # TypeScript interfaces
├── main.tsx          # Entry point
└── index.css         # Tailwind imports
```
