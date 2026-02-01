declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface Database {
    run(sql: string, params?: Record<string, unknown>): Database;
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    bind(params?: Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    reset(): void;
    free(): boolean;
  }

  interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export type { Database, Statement, SqlJsStatic };
}
