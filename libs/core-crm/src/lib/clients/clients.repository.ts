import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import type { CreateClientDto, ListClientsQuery, UpdateClientDto } from '@org/shared-types';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { clients } = schema;

// ClientsRepository: every public method opens a `withTenantTx` so RLS + tenant scoping
// is enforced by Postgres, not by hand-rolled WHERE clauses.
@Injectable()
export class ClientsRepository {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list(q: ListClientsQuery) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const filters = [isNull(clients.deletedAt)];
      if (q.status) filters.push(eq(clients.status, q.status));
      if (q.search) filters.push(ilike(clients.name, `%${q.search}%`));

      return tx
        .select()
        .from(clients)
        .where(and(...filters))
        .orderBy(desc(clients.createdAt))
        .limit(q.limit)
        .offset(q.offset);
    });
  }

  async findById(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx.select().from(clients).where(eq(clients.id, id)).limit(1);
      return rows[0] ?? null;
    });
  }

  async create(dto: CreateClientDto) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .insert(clients)
        .values({
          tenantId,
          name: dto.name,
          status: dto.status ?? 'active',
          notes: dto.notes ?? null,
          tags: dto.tags ?? [],
        })
        .returning();
      return rows[0];
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(clients)
        .set({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          updatedAt: sql`now()`,
        })
        .where(eq(clients.id, id))
        .returning();
      return rows[0] ?? null;
    });
  }

  async softDelete(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(clients)
        .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
        .returning({ id: clients.id });
      return rows[0] ?? null;
    });
  }
}
