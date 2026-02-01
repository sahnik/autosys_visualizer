import initSqlJs, { type Database } from 'sql.js';
import type { Job, GhostNode } from '../types';

// Import the WASM file as a URL so Vite can bundle/resolve it
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let db: Database | null = null;

async function init(): Promise<void> {
  if (SQL) return;
  SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl,
  });
}

function openDatabase(buffer: ArrayBuffer): void {
  if (!SQL) throw new Error('sql.js not initialized — call init() first');
  closeDatabase();
  db = new SQL.Database(new Uint8Array(buffer));
}

function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function isOpen(): boolean {
  return db !== null;
}

function requireDb(): Database {
  if (!db) throw new Error('No database open');
  return db;
}

function hydrateJob(row: Record<string, unknown>, deps: string[]): Job {
  const parseJsonArray = (val: unknown): string[] | undefined => {
    if (typeof val !== 'string' || !val) return undefined;
    try { return JSON.parse(val) as string[]; } catch { return undefined; }
  };

  const parseJsonObject = (val: unknown): Record<string, string> | undefined => {
    if (typeof val !== 'string' || !val) return undefined;
    try { return JSON.parse(val) as Record<string, string>; } catch { return undefined; }
  };

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    type: (row.type as Job['type']) || undefined,
    machine: (row.machine as string) || undefined,
    owner: (row.owner as string) || undefined,
    command: (row.command as string) || undefined,
    condition: (row.condition_expr as string) || undefined,
    schedule: (row.schedule as string) || undefined,
    avgDurationMinutes: row.avg_duration_minutes != null ? Number(row.avg_duration_minutes) : undefined,
    dependencies: deps,
    tags: parseJsonArray(row.tags),
    tablesRead: parseJsonArray(row.tables_read),
    tablesWritten: parseJsonArray(row.tables_written),
    customAttributes: parseJsonObject(row.custom_attributes),
  };
}

function queryRows(sql: string, params?: Record<string, unknown>): Record<string, unknown>[] {
  const d = requireDb();
  const stmt = d.prepare(sql);
  if (params) stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows;
}

function searchJobs(query: string, limit = 20): { id: string; name: string; type?: string }[] {
  requireDb();
  const pattern = `%${query}%`;
  const prefixPattern = `${query}%`;
  const rows = queryRows(
    `SELECT id, name, type FROM jobs
     WHERE name LIKE :pattern OR id LIKE :pattern
     ORDER BY
       CASE WHEN name LIKE :prefix OR id LIKE :prefix THEN 0 ELSE 1 END,
       name
     LIMIT :limit`,
    { ':pattern': pattern, ':prefix': prefixPattern, ':limit': limit }
  );
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: (r.type as string) || undefined,
  }));
}

function getDependencies(jobId: string): string[] {
  const rows = queryRows(
    'SELECT depends_on FROM job_dependencies WHERE job_id = :id',
    { ':id': jobId }
  );
  return rows.map((r) => r.depends_on as string);
}

function getDependenciesMulti(jobIds: string[]): Map<string, string[]> {
  if (jobIds.length === 0) return new Map();
  const d = requireDb();
  // Use temp table for large sets
  d.run('CREATE TEMP TABLE IF NOT EXISTS _lookup_ids (id TEXT PRIMARY KEY)');
  d.run('DELETE FROM _lookup_ids');
  const insertStmt = d.prepare('INSERT OR IGNORE INTO _lookup_ids VALUES (:id)');
  for (const id of jobIds) {
    insertStmt.bind({ ':id': id });
    insertStmt.step();
    insertStmt.reset();
  }
  insertStmt.free();

  const rows = queryRows(
    'SELECT jd.job_id, jd.depends_on FROM job_dependencies jd INNER JOIN _lookup_ids l ON l.id = jd.job_id'
  );

  const map = new Map<string, string[]>();
  for (const id of jobIds) map.set(id, []);
  for (const r of rows) {
    const jid = r.job_id as string;
    map.get(jid)?.push(r.depends_on as string);
  }
  return map;
}

function getJob(id: string): Job | null {
  const rows = queryRows('SELECT * FROM jobs WHERE id = :id', { ':id': id });
  if (rows.length === 0) return null;
  const deps = getDependencies(id);
  return hydrateJob(rows[0], deps);
}

function getJobs(ids: string[]): Job[] {
  if (ids.length === 0) return [];
  const d = requireDb();
  d.run('CREATE TEMP TABLE IF NOT EXISTS _lookup_ids (id TEXT PRIMARY KEY)');
  d.run('DELETE FROM _lookup_ids');
  const insertStmt = d.prepare('INSERT OR IGNORE INTO _lookup_ids VALUES (:id)');
  for (const id of ids) {
    insertStmt.bind({ ':id': id });
    insertStmt.step();
    insertStmt.reset();
  }
  insertStmt.free();

  const rows = queryRows(
    'SELECT j.* FROM jobs j INNER JOIN _lookup_ids l ON l.id = j.id'
  );

  const depsMap = getDependenciesMulti(ids);
  return rows.map((r) => hydrateJob(r, depsMap.get(r.id as string) ?? []));
}

function expandLevels(jobId: string, upLevels: number, downLevels: number): Job[] {
  requireDb();
  const rows = queryRows(
    `WITH RECURSIVE upstream(job_id, depth) AS (
      SELECT :startId, 0
      UNION
      SELECT jd.depends_on, u.depth + 1
      FROM upstream u JOIN job_dependencies jd ON jd.job_id = u.job_id
      WHERE u.depth < :upLevels
    ),
    downstream(job_id, depth) AS (
      SELECT :startId, 0
      UNION
      SELECT jd.job_id, d.depth + 1
      FROM downstream d JOIN job_dependencies jd ON jd.depends_on = d.job_id
      WHERE d.depth < :downLevels
    )
    SELECT DISTINCT j.* FROM jobs j
    WHERE j.id IN (SELECT job_id FROM upstream UNION SELECT job_id FROM downstream)`,
    { ':startId': jobId, ':upLevels': upLevels, ':downLevels': downLevels }
  );

  const ids = rows.map((r) => r.id as string);
  const depsMap = getDependenciesMulti(ids);
  return rows.map((r) => hydrateJob(r, depsMap.get(r.id as string) ?? []));
}

function discoverGhosts(materializedIds: Set<string>): GhostNode[] {
  if (materializedIds.size === 0) return [];
  const d = requireDb();

  // Use temp table for the materialized set
  d.run('CREATE TEMP TABLE IF NOT EXISTS _mat_ids (id TEXT PRIMARY KEY)');
  d.run('DELETE FROM _mat_ids');
  const insertStmt = d.prepare('INSERT OR IGNORE INTO _mat_ids VALUES (:id)');
  for (const id of materializedIds) {
    insertStmt.bind({ ':id': id });
    insertStmt.step();
    insertStmt.reset();
  }
  insertStmt.free();

  const rows = queryRows(
    `SELECT j.id, j.name, j.type, 'upstream' AS direction, jd.job_id AS connected_to
     FROM job_dependencies jd
     JOIN jobs j ON j.id = jd.depends_on
     JOIN _mat_ids m ON m.id = jd.job_id
     WHERE jd.depends_on NOT IN (SELECT id FROM _mat_ids)
     UNION ALL
     SELECT j.id, j.name, j.type, 'downstream' AS direction, jd.depends_on AS connected_to
     FROM job_dependencies jd
     JOIN jobs j ON j.id = jd.job_id
     JOIN _mat_ids m ON m.id = jd.depends_on
     WHERE jd.job_id NOT IN (SELECT id FROM _mat_ids)`
  );

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: (r.type as string) || undefined,
    direction: r.direction as 'upstream' | 'downstream',
    connectedTo: r.connected_to as string,
  }));
}

function getTotalJobCount(): number {
  const rows = queryRows('SELECT COUNT(*) AS cnt FROM jobs');
  return Number(rows[0]?.cnt ?? 0);
}

export const sqliteService = {
  init,
  openDatabase,
  closeDatabase,
  isOpen,
  searchJobs,
  getJob,
  getJobs,
  expandLevels,
  discoverGhosts,
  getTotalJobCount,
};
