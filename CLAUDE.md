# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173 with HMR
npm run build      # Type-check (tsc -b) then bundle via Vite
npm run preview    # Serve the production build locally
```

Production build outputs a single self-contained `dist/index.html` (~1.6MB) with all JS, CSS, and WASM inlined via `vite-plugin-singlefile`. No test framework is configured.

## Tech Stack

- **React 18** + **TypeScript** (strict mode, `noUnusedLocals`/`noUnusedParameters` enforced)
- **Vite** with `vite-plugin-singlefile` for single-file deployment
- **Cytoscape.js** + `cytoscape-dagre` for graph rendering
- **sql.js** (SQLite compiled to WASM) for client-side database queries
- **Tailwind CSS 3** for styling

Fully client-side — no backend. Can be opened from disk or served as a static file.

## Architecture

### Three App Modes

The app operates in one of three mutually exclusive modes, determined in `App.tsx`:
- **Empty** — no data loaded, shows upload prompt
- **JSON** — all jobs loaded from a JSON file; full graph rendered at once
- **Explorer** — SQLite database loaded; jobs materialized incrementally with ghost nodes at the frontier

Mode is derived: `explorer.dbOpen ? 'explorer' : json.jobs.length > 0 ? 'json' : 'empty'`

### State Management

No external state library. Each concern has its own custom hook in `src/hooks/`:

| Hook | Responsibility |
|------|----------------|
| `useAppMode` | Orchestrates JSON vs Explorer mode, exposes unified interface |
| `useGraphData` | JSON file import, validation, sample data loading |
| `useExplorerData` | SQLite loading, incremental expansion, ghost node discovery |
| `useSelection` | Node selection, upstream/downstream highlighting via Cytoscape |
| `useTimingAnalysis` | Critical path computation, duration overrides, baseline tracking |
| `useFixedTimeOverrides` | Fixed-time scheduling flag overrides per job |
| `useAnnotations` | Color-coded notes on jobs, import/export as JSON |

`App.tsx` composes all hooks and passes data down to components.

### Key Data Flow

**JSON mode**: File → `validateJobData()` → `useGraphData` stores jobs → `jobsToCytoscapeElements()` → Cytoscape renders

**Explorer mode**: SQLite file → `sql.js` WASM → user searches → `expandLevels()` BFS query → `discoverGhosts()` → Cytoscape renders materialized nodes + ghost nodes → click ghost → `materializeGhost()` → re-query and merge

### Important Patterns

- **Ghost nodes** — semi-transparent placeholder nodes at graph edges in Explorer mode. They are real Cytoscape nodes (class `ghost`) with minimal data. Clicking materializes them from the database.
- **Incremental graph updates** — Explorer mode uses `addMaterializedJobs()` and `syncGhostNodes()` instead of rebuilding the full graph, preserving zoom/pan state.
- **Annotation nodes** — rendered as small Cytoscape `node.note` elements (tag shape) positioned near their parent job, excluded from layout runs.
- **Cytoscape stylesheet** in `src/styles/cytoscape.ts` — ~100 selectors covering job types (box→rounded rect, condition→diamond, file_watcher→hexagon), selection states, timing visualization (critical path=red, fixed-time=amber, overrides=purple dashed), and annotation colors.
- **sql.js singleton** — `src/services/sqliteService.ts` maintains a single global `db` instance, initialized lazily on first `openDatabase()`. WASM imported via `?url` suffix and excluded from Vite optimizeDeps.

### Timing Analysis (`src/utils/timingAnalysis.ts`)

Topological sort + forward-pass critical path computation. Supports:
- Duration overrides for what-if analysis
- Fixed-time scheduling constraints (`lastRunStart` as wall-clock floor)
- Wait time calculation when upstream finishes before a fixed-time window

Wall-clock times are "HH:MM" strings parsed to minutes-since-midnight. Does not handle midnight crossing.

## Where to Make Changes

- **New data fields** → `src/types/index.ts` (`Job` interface)
- **New state/logic** → new hook in `src/hooks/`
- **New UI** → new component in `src/components/`
- **Graph styling** → `src/styles/cytoscape.ts`
- **Data transforms** → `src/utils/dataTransform.ts`
- **SQLite queries** → `src/services/sqliteService.ts`

## SQLite Schema (Explorer Mode)

Two tables: `jobs` (columns map to `Job` interface, with JSON-encoded array fields for `tags`, `tables_read`, `tables_written`) and `job_dependencies` (composite PK of `job_id`, `depends_on`).
