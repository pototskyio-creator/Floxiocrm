import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema.js';

type Db = PostgresJsDatabase<typeof schema>;

// Cache per URL so the admin role (migrations/auth/seed) and the app role
// (runtime API, subject to RLS) keep separate connection pools. A single
// singleton would silently return the first-used role for every subsequent
// getDb() call — which defeats the tenant-scoping contract entirely.
const pools = new Map<string, { sql: Sql; db: Db }>();

export function getDb(url = process.env.DATABASE_URL): Db {
  if (!url) throw new Error('DATABASE_URL is not set');
  const cached = pools.get(url);
  if (cached) return cached.db;
  const sql = postgres(url, { max: 10, prepare: false });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  pools.set(url, { sql, db });
  return db;
}

export async function closeDb(): Promise<void> {
  const entries = Array.from(pools.values());
  pools.clear();
  await Promise.all(entries.map(({ sql }) => sql.end({ timeout: 5 })));
}
