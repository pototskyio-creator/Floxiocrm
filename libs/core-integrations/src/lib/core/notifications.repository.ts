import { Injectable } from '@nestjs/common';
import { desc, eq, isNull, and, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import { DbService, TenantContext } from '@org/core-crm';

const { notifications } = schema;

// Admin writer used by the worker (no user session).
@Injectable()
export class NotificationsAdminRepository {
  constructor(private readonly db: DbService) {}

  async create(input: {
    tenantId: string;
    channel: string;
    title: string;
    body?: string | null;
    recipientUserId?: string | null;
    sourceKind?: string | null;
    sourceId?: string | null;
  }) {
    return this.db.withAdminTx(async (tx) => {
      const rows = await tx
        .insert(notifications)
        .values({
          tenantId: input.tenantId,
          channel: input.channel,
          title: input.title,
          body: input.body ?? null,
          recipientUserId: input.recipientUserId ?? null,
          sourceKind: input.sourceKind ?? null,
          sourceId: input.sourceId ?? null,
        })
        .returning();
      return rows[0];
    });
  }
}

// Tenant-scoped reader used by the /api/notifications inbox endpoint.
@Injectable()
export class NotificationsRepository {
  constructor(
    private readonly db: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list(opts: { limit: number; offset: number }) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, (tx) =>
      tx
        .select()
        .from(notifications)
        .where(isNull(notifications.deletedAt))
        .orderBy(desc(notifications.createdAt))
        .limit(opts.limit)
        .offset(opts.offset)
    );
  }

  async markRead(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(notifications)
        .set({ readAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(notifications.id, id), isNull(notifications.readAt)))
        .returning();
      return rows[0] ?? null;
    });
  }
}
