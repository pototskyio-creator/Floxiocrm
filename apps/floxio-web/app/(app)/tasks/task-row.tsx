'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button } from '@org/ui-kit';
import type { Task } from '@org/shared-types';
import { apiFetch } from '../../../lib/api-client';

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'done' | 'delete'>(null);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = due && task.status === 'open' && due < new Date();

  async function markDone() {
    setBusy('done');
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'done' }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setBusy('delete');
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-2">{task.title}</td>
      <td className="py-2">
        <Badge tone={task.status}>{task.status}</Badge>
      </td>
      <td className={overdue ? 'py-2 text-amber-600' : 'py-2 text-neutral-600'}>
        {due ? due.toLocaleString() : '—'}
      </td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2">
          {task.status === 'open' && (
            <Button size="sm" variant="secondary" onClick={markDone} disabled={busy !== null}>
              {busy === 'done' ? '…' : 'Done'}
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={remove} disabled={busy !== null}>
            {busy === 'delete' ? '…' : 'Delete'}
          </Button>
        </div>
      </td>
    </tr>
  );
}
