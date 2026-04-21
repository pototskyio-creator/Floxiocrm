import { Badge, Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../../lib/api';

interface NotificationRow {
  id: string;
  channel: string;
  title: string;
  body: string | null;
  sourceKind: string | null;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface InboxMessageRow {
  id: string;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  bodyText: string | null;
  receivedAt: string;
  matchedClientId: string | null;
  readAt: string | null;
}

// Two sources land in the inbox:
//   - notifications: outbound deliveries (in_app/Telegram) logged by the worker
//   - inbox_messages: inbound emails fetched by the IMAP poller
// They're rendered side by side instead of interleaved — clearer for a
// freelancer glancing at "what showed up recently".
export default async function InboxPage() {
  const [notifications, emails] = await Promise.all([
    fetchFromApi<NotificationRow[]>('/api/notifications?limit=100'),
    fetchFromApi<InboxMessageRow[]>('/api/inbox-messages?limit=100').catch(() => []),
  ]);

  const unreadNotifs = notifications.filter((n) => !n.readAt).length;
  const unreadEmails = emails.filter((e) => !e.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-neutral-500">
          {unreadNotifs + unreadEmails > 0 ? (
            <>
              <span className="font-medium text-neutral-900">
                {unreadNotifs + unreadEmails} unread
              </span>
              {' · '}
            </>
          ) : null}
          {notifications.length + emails.length} total
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emails ({emails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Install an IMAP integration in Integrations, add your client&apos;s email on their
              record, and new messages auto-match here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {emails.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex flex-col">
                    <p className="font-medium text-neutral-900">{m.subject || '(no subject)'}</p>
                    <p className="mt-0.5 text-sm text-neutral-600">
                      {m.fromName ? `${m.fromName} · ` : ''}
                      {m.fromEmail ?? 'unknown sender'}
                    </p>
                    {m.bodyText && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-700">{m.bodyText}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(m.receivedAt).toLocaleString()}
                      {m.matchedClientId && ' · matched to a client'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {m.matchedClientId ? <Badge tone="open">linked</Badge> : <Badge>unlinked</Badge>}
                    {!m.readAt && <span className="text-xs font-medium text-amber-600">unread</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications ({notifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Schedule a task with a reminder — deliveries show up here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex flex-col">
                    <p className="font-medium text-neutral-900">{n.title}</p>
                    {n.body && <p className="text-sm text-neutral-600">{n.body}</p>}
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(n.createdAt).toLocaleString()}
                      {n.sourceKind && ` · ${n.sourceKind}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge>{n.channel}</Badge>
                    {!n.readAt && <span className="text-xs font-medium text-amber-600">unread</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
