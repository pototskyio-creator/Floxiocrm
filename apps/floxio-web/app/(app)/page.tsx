import { Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../lib/api';
import type { Client, Project, Task } from '@org/shared-types';

export default async function OverviewPage() {
  const [clients, projects, tasks] = await Promise.all([
    fetchFromApi<Client[]>('/api/clients'),
    fetchFromApi<Project[]>('/api/projects'),
    fetchFromApi<Task[]>('/api/tasks'),
  ]);

  const openTasks = tasks.filter((t) => t.status === 'open');
  const overdue = openTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Active projects" value={projects.length} />
        <StatCard label="Open tasks" value={openTasks.length} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length ? 'warn' : 'neutral'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-500">No projects yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.title}</span>
                  <span className="text-neutral-500">
                    {p.amountCents ? `${p.currency ?? 'USD'} ${(p.amountCents / 100).toLocaleString()}` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'warn';
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
        <p
          className={
            tone === 'warn' && value > 0
              ? 'mt-1 text-3xl font-semibold text-amber-600'
              : 'mt-1 text-3xl font-semibold'
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
