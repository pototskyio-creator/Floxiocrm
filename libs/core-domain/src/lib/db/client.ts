import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let _sql: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Lazily-initialized Drizzle client. Consumers should ensure DATABASE_URL is set
 * before calling. In NestJS code, prefer injecting a provider that wraps this.
 */
export function getDb(url = process.env.DATABASE_URL): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  _sql = postgres(url, { max: 10, prepare: false });
  _db = drizzle(_sql, { schema, casing: 'snake_case' });
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    _db = null;
  }
}
