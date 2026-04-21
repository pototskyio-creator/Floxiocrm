'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
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
import type { Client, ClientStatus } from '@org/shared-types';
import { apiFetch } from '../../../../lib/api-client';

export function ClientEditor({ client }: { client: Client }) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [notes, setNotes] = useState(client.notes ?? '');
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | 'save' | 'delete'>(null);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending('save');
    try {
      await apiFetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, notes: notes || null, status }),
      });
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(null);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${client.name}"?`)) return;
    setError(null);
    setPending('delete');
    try {
      await apiFetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(null);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit client</h1>
        <Link href="/clients" className="text-sm text-neutral-600 underline">
          Back
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{client.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={pending !== null}>
                {pending === 'save' ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={pending !== null}
              >
                {pending === 'delete' ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
