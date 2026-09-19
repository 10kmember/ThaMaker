import postgres from 'postgres';
import { databaseUrl, directDatabaseUrl, env } from '@/lib/env';

const globalForSql = globalThis as unknown as { palmaSql?: postgres.Sql };

function postgresConnection(url: string): { url: string; ssl?: 'require' } {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get('sslmode');
  for (const key of ['schema', 'connection_limit', 'pool_timeout', 'pgbouncer', 'sslmode']) {
    parsed.searchParams.delete(key);
  }
  if ([...parsed.searchParams.keys()].length === 0) parsed.search = '';
  return { url: parsed.toString(), ssl: sslmode === 'require' ? 'require' : undefined };
}

function poolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX ?? '');
  if (Number.isInteger(configured) && configured > 0) return configured;

  // Static generation fans out across dozens of pages. One connection behind
  // Supabase's latency turns that fan-out into a 60s export timeout; runtime
  // serverless isolates stay small, builds get room to work.
  return process.env.NEXT_PHASE === 'phase-production-build' ? 8 : 2;
}

function createSql(): postgres.Sql {
  const connection = postgresConnection(databaseUrl());

  return postgres(connection.url, {
    /**
     * Serverless functions are short-lived and Supabase is already pooling.
     * Keep runtime pools modest, but do not serialize a production build
     * through one socket. `prepare` stays off for transaction pooling.
     */
    max: poolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: connection.ssl,
  });
}

export const sql: postgres.Sql = globalForSql.palmaSql ?? createSql();

if (env.NODE_ENV !== 'production') {
  globalForSql.palmaSql = sql;
}

export type Sql = postgres.Sql;
export type TransactionSql = postgres.TransactionSql;

/** Run writes atomically. Replaces Prisma's `$transaction`. */
export async function withTransaction<T>(run: (tx: TransactionSql) => Promise<T>): Promise<T> {
  return (await sql.begin(async (tx) => run(tx as TransactionSql))) as T;
}

/** Direct, unpooled client for migration scripts only. Never use in request handlers. */
export function migrationSql(): postgres.Sql {
  const connection = postgresConnection(directDatabaseUrl());
  return postgres(connection.url, { max: 1, prepare: false, idle_timeout: 5, ssl: connection.ssl });
}

export async function closeSql(): Promise<void> {
  await sql.end({ timeout: 5 });
}
