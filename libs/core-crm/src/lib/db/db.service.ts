import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDb, closeDb, schema } from '@org/core-domain';

type DbSchema = typeof schema;
export type Db = PostgresJsDatabase<DbSchema>;
export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);

  get db(): Db {
    // The API must connect as a non-superuser so RLS actually scopes queries.
    // DATABASE_URL_APP points to floxio_app (NOSUPERUSER NOBYPASSRLS); DATABASE_URL
    // is the admin role used by migrations and seed scripts.
    const url = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL;
    return getDb(url) as Db;
  }

  // Open a transaction with app.tenant_id set for the duration.
  // Every tenant-scoped repository must call through this helper so RLS kicks in.
  async withTenantTx<T>(tenantId: string, cb: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      return cb(tx);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing database connection');
    await closeDb();
  }
}
