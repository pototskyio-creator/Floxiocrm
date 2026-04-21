import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, lt, sum } from 'drizzle-orm';
import { schema } from '@org/core-domain';
import { DbService } from '../db/db.service.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

const { clients, projects, stages, tasks } = schema;

export interface StageBucket {
  stageId: string;
  stageName: string;
  stageKind: 'open' | 'won' | 'lost';
  position: number;
  projectCount: number;
  amountCentsTotal: number;
}

export interface Overview {
  counts: {
    clients: number;
    projects: number;
    tasksOpen: number;
    tasksDone: number;
    tasksOverdue: number;
  };
  pipeline: StageBucket[];
  recentActivity: Array<{
    kind: 'task' | 'project' | 'client';
    id: string;
    title: string;
    at: string;
  }>;
}

// Lightweight aggregator for the overview page. Every query goes through
// withTenantTx so RLS scopes at the DB layer — the service never hand-rolls
// tenant_id = ... clauses.
@Injectable()
export class StatsService {
  constructor(
    private readonly dbService: DbService,
    private readonly tenant: TenantContext
  ) {}

  async overview(): Promise<Overview> {
    const tenantId = this.tenant.getTenantId();
    return this.dbService.withTenantTx(tenantId, async (tx) => {
      const now = new Date();

      const [[{ n: clientCount }]] = await Promise.all([
        tx
          .select({ n: count() })
          .from(clients)
          .where(isNull(clients.deletedAt)),
      ]);

      const [[{ n: projectCount }]] = await Promise.all([
        tx
          .select({ n: count() })
          .from(projects)
          .where(isNull(projects.deletedAt)),
      ]);

      const [[{ n: tasksOpen }], [{ n: tasksDone }], [{ n: tasksOverdue }]] =
        await Promise.all([
          tx
            .select({ n: count() })
            .from(tasks)
            .where(and(eq(tasks.status, 'open'), isNull(tasks.deletedAt))),
          tx
            .select({ n: count() })
            .from(tasks)
            .where(and(eq(tasks.status, 'done'), isNull(tasks.deletedAt))),
          tx
            .select({ n: count() })
            .from(tasks)
            .where(
              and(
                eq(tasks.status, 'open'),
                isNull(tasks.deletedAt),
                lt(tasks.dueAt, now)
              )
            ),
        ]);

      // Pipeline funnel — one row per stage in the default pipeline order.
      const stageRows = await tx
        .select({
          stageId: stages.id,
          stageName: stages.name,
          stageKind: stages.kind,
          position: stages.position,
          projectCount: count(projects.id),
          amountCentsTotal: sum(projects.amountCents),
        })
        .from(stages)
        .leftJoin(
          projects,
          and(eq(projects.stageId, stages.id), isNull(projects.deletedAt))
        )
        .where(isNull(stages.deletedAt))
        .groupBy(stages.id, stages.name, stages.kind, stages.position)
        .orderBy(asc(stages.position));

      // Recent activity — last ten things that moved, across entities.
      const [recentTasks, recentProjects, recentClients] = await Promise.all([
        tx
          .select({ id: tasks.id, title: tasks.title, at: tasks.updatedAt })
          .from(tasks)
          .where(isNull(tasks.deletedAt))
          .orderBy(desc(tasks.updatedAt))
          .limit(10),
        tx
          .select({ id: projects.id, title: projects.title, at: projects.updatedAt })
          .from(projects)
          .where(isNull(projects.deletedAt))
          .orderBy(desc(projects.updatedAt))
          .limit(10),
        tx
          .select({ id: clients.id, title: clients.name, at: clients.updatedAt })
          .from(clients)
          .where(isNull(clients.deletedAt))
          .orderBy(desc(clients.updatedAt))
          .limit(10),
      ]);

      const recentActivity: Overview['recentActivity'] = [
        ...recentTasks.map((r) => ({ kind: 'task' as const, id: r.id, title: r.title, at: r.at.toISOString() })),
        ...recentProjects.map((r) => ({ kind: 'project' as const, id: r.id, title: r.title, at: r.at.toISOString() })),
        ...recentClients.map((r) => ({ kind: 'client' as const, id: r.id, title: r.title, at: r.at.toISOString() })),
      ]
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 10);

      return {
        counts: {
          clients: Number(clientCount),
          projects: Number(projectCount),
          tasksOpen: Number(tasksOpen),
          tasksDone: Number(tasksDone),
          tasksOverdue: Number(tasksOverdue),
        },
        pipeline: stageRows.map((r) => ({
          stageId: r.stageId,
          stageName: r.stageName,
          stageKind: r.stageKind as 'open' | 'won' | 'lost',
          position: r.position,
          projectCount: Number(r.projectCount),
          amountCentsTotal: Number(r.amountCentsTotal ?? 0),
        })),
        recentActivity,
      };
    });
  }
}
