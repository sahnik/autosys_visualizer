import initSqlJs, { type Database } from 'sql.js';
import type { Job, GhostNode } from '../types';
import type { DataProvider, JobSearchResult } from './dataProvider';

// Import the WASM file as a URL so Vite can bundle/resolve it
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

class SqliteDataProvider implements DataProvider {
  private SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
  private db: Database | null = null;

  async init(): Promise<void> {
    if (this.SQL) return;
    this.SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    });
  }

  openDatabase(buffer: ArrayBuffer): void {
    if (!this.SQL) throw new Error('sql.js not initialized — call init() first');
    this.disconnect();
    this.db = new this.SQL.Database(new Uint8Array(buffer));
  }

  disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  async searchJobs(query: string, limit = 20): Promise<JobSearchResult[]> {
    this.requireDb();
    const pattern = `%${query}%`;
    const prefixPattern = `${query}%`;
    const rows = this.queryRows(
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

  async getJob(id: string): Promise<Job | null> {
    const rows = this.queryRows('SELECT * FROM jobs WHERE id = :id', { ':id': id });
    if (rows.length === 0) return null;
    const deps = this.getDependencies(id);
    return this.hydrateJob(rows[0], deps);
  }

  async getJobs(ids: string[]): Promise<Job[]> {
    if (ids.length === 0) return [];
    const d = this.requireDb();
    d.run('CREATE TEMP TABLE IF NOT EXISTS _lookup_ids (id TEXT PRIMARY KEY)');
    d.run('DELETE FROM _lookup_ids');
    const insertStmt = d.prepare('INSERT OR IGNORE INTO _lookup_ids VALUES (:id)');
    for (const id of ids) {
      insertStmt.bind({ ':id': id });
      insertStmt.step();
      insertStmt.reset();
    }
    insertStmt.free();

    const rows = this.queryRows(
      'SELECT j.* FROM jobs j INNER JOIN _lookup_ids l ON l.id = j.id'
    );

    const depsMap = this.getDependenciesMulti(ids);
    return rows.map((r) => this.hydrateJob(r, depsMap.get(r.id as string) ?? []));
  }

  async expandLevels(jobId: string, upLevels: number, downLevels: number): Promise<Job[]> {
    this.requireDb();
    const rows = this.queryRows(
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
    const depsMap = this.getDependenciesMulti(ids);
    return rows.map((r) => this.hydrateJob(r, depsMap.get(r.id as string) ?? []));
  }

  async discoverGhosts(materializedIds: Set<string>): Promise<GhostNode[]> {
    if (materializedIds.size === 0) return [];
    const d = this.requireDb();

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

    const rows = this.queryRows(
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

  async getTotalJobCount(): Promise<number> {
    const rows = this.queryRows('SELECT COUNT(*) AS cnt FROM jobs');
    return Number(rows[0]?.cnt ?? 0);
  }

  // --- Private helpers ---

  private requireDb(): Database {
    if (!this.db) throw new Error('No database open');
    return this.db;
  }

  private queryRows(sql: string, params?: Record<string, unknown>): Record<string, unknown>[] {
    const d = this.requireDb();
    const stmt = d.prepare(sql);
    if (params) stmt.bind(params);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, unknown>);
    }
    stmt.free();
    return rows;
  }

  private hydrateJob(row: Record<string, unknown>, deps: string[]): Job {
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
      lastRunStart: (row.last_run_start as string) || undefined,
      lastRunEnd: (row.last_run_end as string) || undefined,
      fixedStartTime: row.fixed_start_time != null ? Boolean(row.fixed_start_time) : undefined,
      dependencies: deps,
      tags: parseJsonArray(row.tags),
      tablesRead: parseJsonArray(row.tables_read),
      tablesWritten: parseJsonArray(row.tables_written),
      customAttributes: parseJsonObject(row.custom_attributes),
    };
  }

  private getDependencies(jobId: string): string[] {
    const rows = this.queryRows(
      'SELECT depends_on FROM job_dependencies WHERE job_id = :id',
      { ':id': jobId }
    );
    return rows.map((r) => r.depends_on as string);
  }

  private getDependenciesMulti(jobIds: string[]): Map<string, string[]> {
    if (jobIds.length === 0) return new Map();
    const d = this.requireDb();
    d.run('CREATE TEMP TABLE IF NOT EXISTS _lookup_ids (id TEXT PRIMARY KEY)');
    d.run('DELETE FROM _lookup_ids');
    const insertStmt = d.prepare('INSERT OR IGNORE INTO _lookup_ids VALUES (:id)');
    for (const id of jobIds) {
      insertStmt.bind({ ':id': id });
      insertStmt.step();
      insertStmt.reset();
    }
    insertStmt.free();

    const rows = this.queryRows(
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
}

export const sqliteProvider = new SqliteDataProvider();
