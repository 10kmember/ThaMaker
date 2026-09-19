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

function createSql(): postgres.Sql {
  const raw = databaseUrl();
  const pooled = /[?&]pgbouncer=true\b/.test(raw);
  const connection = postgresConnection(raw);

  return postgres(connection.url, {
    /**
     * Serverless functions are short-lived and Supabase's transaction pooler is
     * the real pool. Keep one upstream connection per isolate and let pgbouncer
     * do the sharing. `prepare` must be off through pgbouncer transaction mode.
     */
    max: 1,
    prepare: !pooled,
    idle_timeout: 20,
    connect_timeout: 20,
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
