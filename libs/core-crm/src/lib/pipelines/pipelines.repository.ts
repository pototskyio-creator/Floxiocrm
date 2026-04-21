import { Injectable } from '@nestjs/common';
import { asc, eq, isNull, and } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { pipelines, stages } = schema;

@Injectable()
export class PipelinesRepository {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async listWithStages() {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const pipelineRows = await tx
        .select()
        .from(pipelines)
        .where(isNull(pipelines.deletedAt))
        .orderBy(asc(pipelines.createdAt));

      if (pipelineRows.length === 0) return [];

      const stageRows = await tx
        .select()
        .from(stages)
        .where(isNull(stages.deletedAt))
        .orderBy(asc(stages.pipelineId), asc(stages.position));

      const byPipeline = new Map<string, typeof stageRows>();
      for (const s of stageRows) {
        const arr = byPipeline.get(s.pipelineId) ?? [];
        arr.push(s);
        byPipeline.set(s.pipelineId, arr);
      }

      return pipelineRows.map((p) => ({ ...p, stages: byPipeline.get(p.id) ?? [] }));
    });
  }

  async findDefault() {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(pipelines)
        .where(and(eq(pipelines.isDefault, true), isNull(pipelines.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async firstOpenStage(pipelineId: string) {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(stages)
        .where(
          and(
            eq(stages.pipelineId, pipelineId),
            eq(stages.kind, 'open'),
            isNull(stages.deletedAt)
          )
        )
        .orderBy(asc(stages.position))
        .limit(1);
      return rows[0] ?? null;
    });
  }
}
