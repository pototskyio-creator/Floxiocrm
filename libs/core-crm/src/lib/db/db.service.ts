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

  // Runtime API pool: connects as floxio_app (NOSUPERUSER NOBYPASSRLS).
  // Every tenant-scoped query must go through `withTenantTx`.
  get db(): Db {
    const url = process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL;
    return getDb(url) as Db;
  }

  // Admin pool: connects as floxio (superuser). Used only by worker-mode code
  // that has no user session (background processors, cron). Setting
  // app.admin='on' also makes RLS policies bypass — belt + suspenders.
  get adminDb(): Db {
    const url = process.env.DATABASE_URL;
    return getDb(url) as Db;
  }

  async withTenantTx<T>(tenantId: string, cb: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      return cb(tx);
    });
  }

  async withAdminTx<T>(cb: (tx: DbTx) => Promise<T>): Promise<T> {
    return this.adminDb.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);
      return cb(tx);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing database connection');
    await closeDb();
  }
}
