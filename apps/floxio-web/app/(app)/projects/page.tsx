import { Badge, Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../../lib/api';
import type { Client, PipelineWithStages, Project } from '@org/shared-types';

export default async function ProjectsPage() {
  const [projects, pipelines, clients] = await Promise.all([
    fetchFromApi<Project[]>('/api/projects'),
    fetchFromApi<PipelineWithStages[]>('/api/pipelines'),
    fetchFromApi<Client[]>('/api/clients'),
  ]);

  const clientById = new Map(clients.map((c) => [c.id, c.name]));
  const stageById = new Map(
    pipelines.flatMap((p) => p.stages).map((s) => [s.id, s])
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <Card>
        <CardHeader>
          <CardTitle>{projects.length} total</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-neutral-500">No projects yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const stage = stageById.get(p.stageId);
                  return (
                    <tr key={p.id} className="border-t border-neutral-100">
                      <td className="py-2">{p.title}</td>
                      <td className="py-2 text-neutral-600">{clientById.get(p.clientId) ?? '—'}</td>
                      <td className="py-2">
                        {stage ? <Badge tone={stage.kind}>{stage.name}</Badge> : '—'}
                      </td>
                      <td className="py-2 text-neutral-600">
                        {p.amountCents
                          ? `${p.currency ?? 'USD'} ${(p.amountCents / 100).toLocaleString()}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
