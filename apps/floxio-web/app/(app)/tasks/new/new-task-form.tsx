'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@org/ui-kit';
import type { Client, ReminderChannel } from '@org/shared-types';
import { apiFetch } from '../../../../lib/api-client';

export function NewTaskForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [dueAtLocal, setDueAtLocal] = useState<string>('');
  const [channel, setChannel] = useState<ReminderChannel | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // <input type="datetime-local"> yields "YYYY-MM-DDTHH:mm" in local time —
      // convert to an ISO instant by treating it as local and letting the
      // browser format via Date.
      const dueAt = dueAtLocal ? new Date(dueAtLocal).toISOString() : undefined;
      const body: Record<string, unknown> = {
        title,
        description: description || null,
        clientId: clientId || null,
      };
      if (dueAt) {
        body.dueAt = dueAt;
        if (channel) body.reminder = { channel, offsetSeconds: 0 };
      }
      await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
      router.push('/tasks');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={1}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client">Client (optional)</Label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
            >
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueAt">Due</Label>
            <Input
              id="dueAt"
              type="datetime-local"
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel">Reminder channel (optional)</Label>
            <select
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ReminderChannel | '')}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
              disabled={!dueAtLocal}
            >
              <option value="">No reminder</option>
              <option value="in_app">In-app</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create task'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
