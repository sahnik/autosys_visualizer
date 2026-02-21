# Data Provider API

This document describes the `DataProvider` interface that backs Explorer mode. The bundled `SqliteDataProvider` implements it using a client-side SQLite database via sql.js. A future API-backed provider can implement the same interface to swap in server-side data without changing hooks or components.

## Interface

```typescript
interface DataProvider {
  disconnect(): void;
  isConnected(): boolean;
  searchJobs(query: string, limit?: number): Promise<JobSearchResult[]>;
  getJob(id: string): Promise<Job | null>;
  getJobs(ids: string[]): Promise<Job[]>;
  expandLevels(jobId: string, upLevels: number, downLevels: number): Promise<Job[]>;
  discoverGhosts(materializedIds: Set<string>): Promise<GhostNode[]>;
  getTotalJobCount(): Promise<number>;
}
```

Connection is provider-specific and not part of the interface (SQLite takes an `ArrayBuffer`, an API provider would take a URL/token).

## Types

### `JobSearchResult`

```typescript
{ id: string; name: string; type?: string }
```

### `Job`

See `src/types/index.ts`. Key fields: `id`, `name`, `type`, `dependencies: string[]`, `avgDurationMinutes`, `lastRunStart`, `lastRunEnd`, `fixedStartTime`.

### `GhostNode`

```typescript
{ id: string; name: string; type?: string; direction: 'upstream' | 'downstream'; connectedTo: string }
```

A ghost node is a job that borders the currently materialized graph but is not itself materialized. `direction` indicates whether it is an upstream dependency or downstream dependent of `connectedTo`.

---

## Operations

### `searchJobs(query, limit?)`

Full-text search over job names and IDs.

- **Parameters**: `query` — substring to match; `limit` — max results (default 20)
- **Returns**: `JobSearchResult[]` sorted by prefix match quality then name
- **Behavior**: Matches jobs where `name LIKE '%query%'` or `id LIKE '%query%'`. Results with a prefix match sort first.

**Example request** (API provider):
```
GET /api/jobs/search?q=daily_batch&limit=20
```

**Example response**:
```json
[
  { "id": "daily_batch_load", "name": "daily_batch_load", "type": "box" },
  { "id": "daily_batch_transform", "name": "daily_batch_transform", "type": "command" }
]
```

### `getJob(id)`

Fetch a single job by ID with its dependencies.

- **Parameters**: `id` — job identifier
- **Returns**: `Job | null`

**Example request**:
```
GET /api/jobs/daily_batch_load
```

**Example response**:
```json
{
  "id": "daily_batch_load",
  "name": "daily_batch_load",
  "type": "box",
  "dependencies": ["file_watcher_source"],
  "avgDurationMinutes": 45,
  "lastRunStart": "02:30",
  "lastRunEnd": "03:15"
}
```

### `getJobs(ids)`

Batch fetch multiple jobs by ID.

- **Parameters**: `ids` — array of job IDs
- **Returns**: `Job[]` (only jobs that exist; order not guaranteed)

**Example request**:
```
POST /api/jobs/batch
{ "ids": ["job_a", "job_b", "job_c"] }
```

### `expandLevels(jobId, upLevels, downLevels)`

Starting from `jobId`, traverse `upLevels` hops upstream (via dependencies) and `downLevels` hops downstream (via dependents). Return all discovered jobs with their dependencies.

- **Parameters**: `jobId` — starting node; `upLevels` — upstream depth; `downLevels` — downstream depth
- **Returns**: `Job[]` including the starting job
- **Behavior**: BFS traversal. A job's `dependencies` array is always fully populated regardless of whether those dependencies are in the result set.

**Example request**:
```
GET /api/jobs/daily_batch_load/expand?up=2&down=1
```

### `discoverGhosts(materializedIds)`

Given the set of currently materialized job IDs, find all jobs that are one edge away but not yet materialized.

- **Parameters**: `materializedIds` — `Set<string>` of IDs currently in the graph
- **Returns**: `GhostNode[]` — one entry per (ghost, materialized neighbor) pair. A single ghost job may appear multiple times if it connects to multiple materialized jobs.

**Example request**:
```
POST /api/jobs/ghosts
{ "materializedIds": ["job_a", "job_b"] }
```

**Example response**:
```json
[
  { "id": "job_x", "name": "job_x", "type": "box", "direction": "upstream", "connectedTo": "job_a" },
  { "id": "job_y", "name": "job_y", "direction": "downstream", "connectedTo": "job_b" }
]
```

### `getTotalJobCount()`

Return the total number of jobs in the data source.

- **Returns**: `number`

**Example request**:
```
GET /api/jobs/count
```

### `disconnect()`

Close the connection and release resources.

### `isConnected()`

Returns `true` if a data source is currently open/connected.

---

## SQLite Schema

The SQLite provider expects two tables:

```sql
CREATE TABLE jobs (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  type                TEXT,          -- 'box' | 'command' | 'file_watcher' | 'condition'
  machine             TEXT,
  owner               TEXT,
  command             TEXT,
  condition_expr      TEXT,
  schedule            TEXT,
  avg_duration_minutes REAL,
  last_run_start      TEXT,          -- 'HH:MM'
  last_run_end        TEXT,          -- 'HH:MM'
  fixed_start_time    INTEGER,       -- 0 or 1
  tags                TEXT,          -- JSON array: '["tag1","tag2"]'
  tables_read         TEXT,          -- JSON array
  tables_written      TEXT,          -- JSON array
  custom_attributes   TEXT           -- JSON object: '{"key":"value"}'
);

CREATE TABLE job_dependencies (
  job_id     TEXT NOT NULL,
  depends_on TEXT NOT NULL,
  PRIMARY KEY (job_id, depends_on)
);
```

## Notes for Implementing an API Provider

1. Create a class implementing `DataProvider` (e.g., `ApiDataProvider`).
2. Add a provider-specific `connect(url: string, token?: string)` method (not on the interface).
3. All interface methods return `Promise` — use `fetch` or your HTTP client.
4. `discoverGhosts` receives a `Set<string>` — serialize as an array in the request body.
5. `expandLevels` must return jobs with their full `dependencies` arrays populated, not just the dependencies within the expansion window.
6. Export a singleton or factory and wire it into `useExplorerData` (or make the hook accept a provider parameter).
