import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import type { ListTasksQuery, UpdateTaskDto } from '@org/shared-types';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { tasks } = schema;

@Injectable()
export class TasksRepository {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list(q: ListTasksQuery) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const filters = [isNull(tasks.deletedAt)];
      if (q.status) filters.push(eq(tasks.status, q.status));
      if (q.clientId) filters.push(eq(tasks.clientId, q.clientId));
      if (q.projectId) filters.push(eq(tasks.projectId, q.projectId));
      if (q.dueBefore) filters.push(lte(tasks.dueAt, new Date(q.dueBefore)));

      return tx
        .select()
        .from(tasks)
        .where(and(...filters))
        .orderBy(desc(tasks.createdAt))
        .limit(q.limit)
        .offset(q.offset);
    });
  }

  async findById(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      return rows[0] ?? null;
    });
  }

  async create(input: {
    title: string;
    description?: string | null;
    clientId?: string | null;
    projectId?: string | null;
    assigneeUserId?: string | null;
    dueAt?: Date | null;
  }) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .insert(tasks)
        .values({
          tenantId,
          title: input.title,
          description: input.description ?? null,
          clientId: input.clientId ?? null,
          projectId: input.projectId ?? null,
          assigneeUserId: input.assigneeUserId ?? null,
          dueAt: input.dueAt ?? null,
        })
        .returning();
      return rows[0];
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(tasks)
        .set({
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
          ...(dto.clientId !== undefined && { clientId: dto.clientId }),
          ...(dto.projectId !== undefined && { projectId: dto.projectId }),
          // If caller moves to done/canceled, stamp completed_at.
          ...(dto.status === 'done' || dto.status === 'canceled'
            ? { completedAt: sql`now()` }
            : {}),
          ...(dto.status === 'open' ? { completedAt: null } : {}),
          updatedAt: sql`now()`,
        })
        .where(eq(tasks.id, id))
        .returning();
      return rows[0] ?? null;
    });
  }

  async softDelete(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(tasks)
        .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
        .returning({ id: tasks.id });
      return rows[0] ?? null;
    });
  }
}

// Admin variant for worker-mode writes (inbound webhooks, queued jobs).
@Injectable()
export class TasksAdminRepository {
  constructor(private readonly dbService: DbService) {}

  async createAdmin(input: {
    tenantId: string;
    title: string;
    description?: string | null;
  }) {
    return this.dbService.withAdminTx(async (tx) => {
      const rows = await tx
        .insert(tasks)
        .values({
          tenantId: input.tenantId,
          title: input.title,
          description: input.description ?? null,
        })
        .returning();
      return rows[0];
    });
  }
}
