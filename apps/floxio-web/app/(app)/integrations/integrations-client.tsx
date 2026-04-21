'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@org/ui-kit';
import { apiFetch } from '../../../lib/api-client';

interface InstanceRow {
  id: string;
  kind: string;
  name: string;
  status: 'active' | 'disabled' | 'error';
  lastError: string | null;
  createdAt: string;
}

interface KindRow {
  kind: string;
  displayName: string;
  supportsDeliver: boolean;
  supportsPoll: boolean;
}

export function IntegrationsClient({
  instances,
  kinds,
}: {
  instances: InstanceRow[];
  kinds: KindRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <Card>
        <CardHeader>
          <CardTitle>Installed ({instances.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <p className="text-sm text-neutral-500">No integrations yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {instances.map((inst) => (
                <InstalledRow key={inst.id} inst={inst} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-neutral-600">
            Create a bot via @BotFather, then paste the token and the chat id you want reminders
            delivered to. Run{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5">/start</code> to your bot and
            visit{' '}
            <code className="rounded bg-neutral-100 px-1 py-0.5">
              https://api.telegram.org/bot&lt;token&gt;/getUpdates
            </code>{' '}
            to find the chat id.
          </p>
          <TelegramInstallForm disabled={!kinds.find((k) => k.kind === 'telegram')} />
        </CardContent>
      </Card>
    </div>
  );
}

function InstalledRow({ inst }: { inst: InstanceRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'test' | 'delete'>(null);

  async function test() {
    setBusy('test');
    try {
      const res = await apiFetch<{ ok: boolean; detail?: string }>(
        `/api/integrations/${inst.id}/test`,
        { method: 'POST' }
      );
      alert(res.ok ? `OK — ${res.detail ?? 'healthy'}` : `Failed — ${res.detail ?? 'check'}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Uninstall ${inst.kind} "${inst.name}"?`)) return;
    setBusy('delete');
    try {
      await apiFetch(`/api/integrations/${inst.id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium">
          {inst.name}{' '}
          <span className="text-xs font-normal text-neutral-500">({inst.kind})</span>
        </p>
        {inst.lastError && (
          <p className="mt-0.5 text-xs text-red-600">Last error: {inst.lastError}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={inst.status === 'active' ? 'open' : inst.status === 'error' ? 'lost' : 'canceled'}>
          {inst.status}
        </Badge>
        <Button size="sm" variant="secondary" onClick={test} disabled={busy !== null}>
          {busy === 'test' ? '…' : 'Test'}
        </Button>
        <Button size="sm" variant="danger" onClick={remove} disabled={busy !== null}>
          {busy === 'delete' ? '…' : 'Uninstall'}
        </Button>
      </div>
    </li>
  );
}

function TelegramInstallForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiFetch('/api/integrations', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'telegram',
          name: 'Telegram bot',
          config: { botToken, chatId },
        }),
      });
      setBotToken('');
      setChatId('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="botToken">Bot token</Label>
        <Input
          id="botToken"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          required
          minLength={20}
          placeholder="123456:ABC..."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="chatId">Chat id</Label>
        <Input
          id="chatId"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || disabled}>
        {pending ? 'Installing…' : 'Install'}
      </Button>
    </form>
  );
}
