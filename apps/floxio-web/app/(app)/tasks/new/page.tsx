import Link from 'next/link';
import { fetchFromApi } from '../../../../lib/api';
import type { Client } from '@org/shared-types';
import { NewTaskForm } from './new-task-form';

export default async function NewTaskPage() {
  const clients = await fetchFromApi<Client[]>('/api/clients');
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New task</h1>
        <Link href="/tasks" className="text-sm text-neutral-600 underline">
          Cancel
        </Link>
      </div>
      <NewTaskForm clients={clients} />
    </div>
  );
}
