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

export default async function InboxPage() {
  const rows = await fetchFromApi<NotificationRow[]>('/api/notifications?limit=100');
  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-neutral-500">
          {rows.length} total · <span className="font-medium text-neutral-900">{unread} unread</span>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nothing here yet. Install an integration and schedule a task with a reminder —
              deliveries show up here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {rows.map((n) => (
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
                    {!n.readAt && (
                      <span className="text-xs font-medium text-amber-600">unread</span>
                    )}
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
