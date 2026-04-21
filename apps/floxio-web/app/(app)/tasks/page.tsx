import { Badge, Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../../lib/api';
import type { Task } from '@org/shared-types';

export default async function TasksPage() {
  const tasks = await fetchFromApi<Task[]>('/api/tasks');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <Card>
        <CardHeader>
          <CardTitle>{tasks.length} total</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-neutral-500">No tasks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const due = t.dueAt ? new Date(t.dueAt) : null;
                  const overdue = due && t.status === 'open' && due < new Date();
                  return (
                    <tr key={t.id} className="border-t border-neutral-100">
                      <td className="py-2">{t.title}</td>
                      <td className="py-2">
                        <Badge tone={t.status}>{t.status}</Badge>
                      </td>
                      <td className={overdue ? 'py-2 text-amber-600' : 'py-2 text-neutral-600'}>
                        {due ? due.toLocaleDateString() : '—'}
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
