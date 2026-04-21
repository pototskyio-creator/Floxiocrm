import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../../lib/api';
import type { Task } from '@org/shared-types';
import { TaskRow } from './task-row';

export default async function TasksPage() {
  const tasks = await fetchFromApi<Task[]>('/api/tasks');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Link href="/tasks/new">
          <Button>New task</Button>
        </Link>
      </div>
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
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
