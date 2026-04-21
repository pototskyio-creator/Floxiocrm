import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from '@org/ui-kit';
import { fetchFromApi } from '../../lib/api';

interface Overview {
  counts: {
    clients: number;
    projects: number;
    tasksOpen: number;
    tasksDone: number;
    tasksOverdue: number;
  };
  pipeline: Array<{
    stageId: string;
    stageName: string;
    stageKind: 'open' | 'won' | 'lost';
    position: number;
    projectCount: number;
    amountCentsTotal: number;
  }>;
  recentActivity: Array<{
    kind: 'task' | 'project' | 'client';
    id: string;
    title: string;
    at: string;
  }>;
}

export default async function OverviewPage() {
  const overview = await fetchFromApi<Overview>('/api/stats/overview');

  const wonRevenue = overview.pipeline
    .filter((p) => p.stageKind === 'won')
    .reduce((sum, p) => sum + p.amountCentsTotal, 0);

  const maxStageCount = Math.max(1, ...overview.pipeline.map((p) => p.projectCount));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Clients" value={overview.counts.clients} />
        <Stat label="Active projects" value={overview.counts.projects} />
        <Stat label="Open tasks" value={overview.counts.tasksOpen} />
        <Stat
          label="Overdue"
          value={overview.counts.tasksOverdue}
          tone={overview.counts.tasksOverdue > 0 ? 'warn' : 'neutral'}
        />
        <Stat label="Won revenue" value={formatMoney(wonRevenue)} muted={wonRevenue === 0} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.pipeline.length === 0 ? (
              <p className="text-sm text-neutral-500">No stages configured.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {overview.pipeline.map((p) => {
                  const pct = Math.round((p.projectCount / maxStageCount) * 100);
                  return (
                    <li key={p.stageId} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-sm text-neutral-700">
                        <span className="mr-2">{p.stageName}</span>
                        <Badge tone={p.stageKind}>{p.stageKind}</Badge>
                      </div>
                      <div className="relative h-6 flex-1 rounded-md bg-neutral-100">
                        <div
                          className={cn(
                            'h-6 rounded-md',
                            p.stageKind === 'won'
                              ? 'bg-emerald-400'
                              : p.stageKind === 'lost'
                                ? 'bg-rose-300'
                                : 'bg-blue-400'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-28 shrink-0 text-right text-sm tabular-nums text-neutral-700">
                        {p.projectCount} · {formatMoney(p.amountCentsTotal)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.recentActivity.map((a) => (
                  <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <Link
                        href={
                          a.kind === 'client'
                            ? `/clients/${a.id}`
                            : a.kind === 'project'
                              ? '/projects'
                              : '/tasks'
                        }
                        className="text-neutral-900 hover:underline"
                      >
                        {a.title}
                      </Link>
                    </span>
                    <Badge>{a.kind}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8 text-sm">
            <TaskStat label="Open" value={overview.counts.tasksOpen} color="text-blue-600" />
            <TaskStat label="Done" value={overview.counts.tasksDone} color="text-emerald-600" />
            <TaskStat
              label="Overdue"
              value={overview.counts.tasksOverdue}
              color={overview.counts.tasksOverdue > 0 ? 'text-amber-600' : 'text-neutral-500'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
  muted = false,
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'warn';
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
        <p
          className={cn(
            'mt-1 text-3xl font-semibold',
            tone === 'warn' && typeof value === 'number' && value > 0 && 'text-amber-600',
            muted && 'text-neutral-400'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function TaskStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', color)}>{value}</span>
    </div>
  );
}

function formatMoney(cents: number): string {
  if (!cents) return '—';
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}
