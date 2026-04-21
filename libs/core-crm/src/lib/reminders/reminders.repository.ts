import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import type { ReminderChannel, ReminderStatus } from '@org/shared-types';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { reminders } = schema;

@Injectable()
export class RemindersRepository {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async create(input: {
    taskId: string;
    fireAt: Date;
    channel: ReminderChannel;
  }) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .insert(reminders)
        .values({
          tenantId,
          taskId: input.taskId,
          fireAt: input.fireAt,
          channel: input.channel,
        })
        .returning();
      return rows[0];
    });
  }

  async setJobId(reminderId: string, jobId: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      await tx
        .update(reminders)
        .set({ jobId, updatedAt: sql`now()` })
        .where(eq(reminders.id, reminderId));
    });
  }

  async findById(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx.select().from(reminders).where(eq(reminders.id, id)).limit(1);
      return rows[0] ?? null;
    });
  }

  async listByTask(taskId: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      return tx.select().from(reminders).where(eq(reminders.taskId, taskId));
    });
  }
}

// Admin-mode helpers used by the worker. Worker doesn't have a user session —
// it opens transactions with app.admin='on' so it can mutate any tenant's row.
@Injectable()
export class RemindersAdminRepository {
  constructor(private readonly dbService: DbService) {}

  async findByIdAdmin(id: string) {
    return this.dbService.withAdminTx(async (tx) => {
      const rows = await tx.select().from(reminders).where(eq(reminders.id, id)).limit(1);
      return rows[0] ?? null;
    });
  }

  // Joined read used by the worker when building the delivery payload.
  // Returns null if either the reminder or its task has been removed.
  async findWithTaskAdmin(id: string) {
    return this.dbService.withAdminTx(async (tx) => {
      const rows = await tx
        .select({
          reminder: reminders,
          task: schema.tasks,
        })
        .from(reminders)
        .innerJoin(schema.tasks, eq(reminders.taskId, schema.tasks.id))
        .where(eq(reminders.id, id))
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async markFired(id: string) {
    return this.dbService.withAdminTx(async (tx) => {
      await tx
        .update(reminders)
        .set({
          status: 'fired' satisfies ReminderStatus,
          firedAt: sql`now()`,
          attempts: sql`${reminders.attempts} + 1`,
          lastAttemptAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(reminders.id, id));
    });
  }

  async markFailed(id: string, error: string) {
    return this.dbService.withAdminTx(async (tx) => {
      await tx
        .update(reminders)
        .set({
          status: 'failed' satisfies ReminderStatus,
          lastError: error.slice(0, 2000),
          attempts: sql`${reminders.attempts} + 1`,
          lastAttemptAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(reminders.id, id));
    });
  }
}
