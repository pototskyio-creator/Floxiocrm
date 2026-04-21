import { Injectable } from '@nestjs/common';
import { schema } from '@org/core-domain';
import { DbService } from '@org/core-crm';

const { notifications } = schema;

// Notifications live across tenants and are written by the worker (no user
// session), so this repo uses the admin transaction helper exclusively.
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
