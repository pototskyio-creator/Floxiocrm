import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import { DbService, TenantContext } from '@org/core-crm';

const { integrationInstances } = schema;

@Injectable()
export class IntegrationInstancesRepository {
  constructor(
    private readonly db: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list() {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, (tx) =>
      tx
        .select()
        .from(integrationInstances)
        .where(isNull(integrationInstances.deletedAt))
    );
  }

  async findByKind(kind: string) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, (tx) =>
      tx
        .select()
        .from(integrationInstances)
        .where(
          and(
            eq(integrationInstances.kind, kind),
            isNull(integrationInstances.deletedAt)
          )
        )
    );
  }

  async findById(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(integrationInstances)
        .where(eq(integrationInstances.id, id))
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async create(input: { kind: string; name: string; config: string | null }) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .insert(integrationInstances)
        .values({
          tenantId,
          kind: input.kind,
          name: input.name,
          config: input.config,
        })
        .returning();
      return rows[0];
    });
  }

  async setError(id: string, error: string | null) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      await tx
        .update(integrationInstances)
        .set({
          lastError: error,
          status: error ? 'error' : 'active',
          lastCheckedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(integrationInstances.id, id));
    });
  }

  async softDelete(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(integrationInstances)
        .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            eq(integrationInstances.id, id),
            isNull(integrationInstances.deletedAt)
          )
        )
        .returning({ id: integrationInstances.id });
      return rows[0] ?? null;
    });
  }
}

// Admin variant for worker-mode code (no user session). Reads across tenants
// via app.admin='on' — the worker needs this to find an instance for a
// tenant+kind when processing a queued job, and the public webhook endpoint
// uses findByIdAdmin since it only has the instance id from the URL.
@Injectable()
export class IntegrationInstancesAdminRepository {
  constructor(private readonly db: DbService) {}

  async findActiveForTenant(tenantId: string, kind: string) {
    return this.db.withAdminTx(async (tx) => {
      const rows = await tx
        .select()
        .from(integrationInstances)
        .where(
          and(
            eq(integrationInstances.tenantId, tenantId),
            eq(integrationInstances.kind, kind),
            eq(integrationInstances.status, 'active'),
            isNull(integrationInstances.deletedAt)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async findByIdAdmin(id: string) {
    return this.db.withAdminTx(async (tx) => {
      const rows = await tx
        .select()
        .from(integrationInstances)
        .where(eq(integrationInstances.id, id))
        .limit(1);
      return rows[0] ?? null;
    });
  }

  // All active instances of a given kind across tenants. Used by the worker's
  // periodic poller (e.g. IMAP) to fan out per-tenant poll() calls.
  async findAllActiveByKind(kind: string) {
    return this.db.withAdminTx(async (tx) => {
      return tx
        .select()
        .from(integrationInstances)
        .where(
          and(
            eq(integrationInstances.kind, kind),
            eq(integrationInstances.status, 'active'),
            isNull(integrationInstances.deletedAt)
          )
        );
    });
  }

  async markCheckedAdmin(id: string, error: string | null) {
    return this.db.withAdminTx(async (tx) => {
      await tx
        .update(integrationInstances)
        .set({
          lastError: error,
          status: error ? 'error' : 'active',
          lastCheckedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(integrationInstances.id, id));
    });
  }
}
