import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import { DbService, TenantContext } from '@org/core-crm';

const { inboxMessages } = schema;

// Admin writer — IMAP polling runs in the worker without a user session.
@Injectable()
export class InboxMessagesAdminRepository {
  constructor(private readonly db: DbService) {}

  // Insert if a row with the same (tenant, instance, messageId) doesn't exist.
  // Returns the row (either the newly-inserted one or the existing duplicate).
  async upsertByMessageId(input: {
    tenantId: string;
    integrationInstanceId: string;
    messageId: string;
    fromEmail: string | null;
    fromName: string | null;
    subject: string | null;
    bodyText: string | null;
    receivedAt: Date;
    matchedClientId: string | null;
  }) {
    return this.db.withAdminTx(async (tx) => {
      const rows = await tx
        .insert(inboxMessages)
        .values({
          tenantId: input.tenantId,
          integrationInstanceId: input.integrationInstanceId,
          messageId: input.messageId,
          fromEmail: input.fromEmail,
          fromName: input.fromName,
          subject: input.subject,
          bodyText: input.bodyText,
          receivedAt: input.receivedAt,
          matchedClientId: input.matchedClientId,
        })
        .onConflictDoNothing()
        .returning();
      return rows[0] ?? null;
    });
  }

  async countForInstance(integrationInstanceId: string): Promise<number> {
    return this.db.withAdminTx(async (tx) => {
      const rows = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(inboxMessages)
        .where(eq(inboxMessages.integrationInstanceId, integrationInstanceId));
      return rows[0]?.n ?? 0;
    });
  }
}

// Tenant-scoped reader for the /api/inbox-messages inbox view.
@Injectable()
export class InboxMessagesRepository {
  constructor(
    private readonly db: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list(opts: { limit: number; offset: number }) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, (tx) =>
      tx
        .select()
        .from(inboxMessages)
        .where(isNull(inboxMessages.deletedAt))
        .orderBy(desc(inboxMessages.receivedAt))
        .limit(opts.limit)
        .offset(opts.offset)
    );
  }

  async markRead(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.db.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(inboxMessages)
        .set({ readAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(inboxMessages.id, id), isNull(inboxMessages.readAt)))
        .returning();
      return rows[0] ?? null;
    });
  }
}
