import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import type {
  CreateProjectDto,
  ListProjectsQuery,
  UpdateProjectDto,
} from '@org/shared-types';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { projects, stages } = schema;

@Injectable()
export class ProjectsRepository {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async list(q: ListProjectsQuery) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const filters = [isNull(projects.deletedAt)];
      if (q.clientId) filters.push(eq(projects.clientId, q.clientId));
      if (q.pipelineId) filters.push(eq(projects.pipelineId, q.pipelineId));
      if (q.stageId) filters.push(eq(projects.stageId, q.stageId));

      // stageKind requires joining stages — do it inline since we already
      // scope via tenant and RLS makes it safe.
      if (q.stageKind) {
        return tx
          .select({
            id: projects.id,
            tenantId: projects.tenantId,
            clientId: projects.clientId,
            pipelineId: projects.pipelineId,
            stageId: projects.stageId,
            title: projects.title,
            amountCents: projects.amountCents,
            currency: projects.currency,
            notes: projects.notes,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            deletedAt: projects.deletedAt,
          })
          .from(projects)
          .innerJoin(stages, eq(projects.stageId, stages.id))
          .where(and(...filters, eq(stages.kind, q.stageKind)))
          .orderBy(desc(projects.createdAt))
          .limit(q.limit)
          .offset(q.offset);
      }

      return tx
        .select()
        .from(projects)
        .where(and(...filters))
        .orderBy(desc(projects.createdAt))
        .limit(q.limit)
        .offset(q.offset);
    });
  }

  async findById(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx.select().from(projects).where(eq(projects.id, id)).limit(1);
      return rows[0] ?? null;
    });
  }

  async create(
    dto: CreateProjectDto & { pipelineId: string; stageId: string }
  ) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .insert(projects)
        .values({
          tenantId,
          clientId: dto.clientId,
          pipelineId: dto.pipelineId,
          stageId: dto.stageId,
          title: dto.title,
          amountCents: dto.amountCents ?? null,
          currency: dto.currency ?? null,
          notes: dto.notes ?? null,
        })
        .returning();
      return rows[0];
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(projects)
        .set({
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.amountCents !== undefined && { amountCents: dto.amountCents }),
          ...(dto.currency !== undefined && { currency: dto.currency }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          updatedAt: sql`now()`,
        })
        .where(eq(projects.id, id))
        .returning();
      return rows[0] ?? null;
    });
  }

  async moveToStage(id: string, stageId: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      // Guard: the target stage must belong to this project's pipeline.
      // RLS scopes both rows to the tenant, so no extra tenant check needed.
      const project = await tx
        .select({ pipelineId: projects.pipelineId })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      if (!project[0]) return null;

      const stage = await tx
        .select({ pipelineId: stages.pipelineId })
        .from(stages)
        .where(eq(stages.id, stageId))
        .limit(1);
      if (!stage[0] || stage[0].pipelineId !== project[0].pipelineId) {
        throw new Error('Stage does not belong to this project pipeline');
      }

      const rows = await tx
        .update(projects)
        .set({ stageId, updatedAt: sql`now()` })
        .where(eq(projects.id, id))
        .returning();
      return rows[0] ?? null;
    });
  }

  async softDelete(id: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .update(projects)
        .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
        .returning({ id: projects.id });
      return rows[0] ?? null;
    });
  }
}
