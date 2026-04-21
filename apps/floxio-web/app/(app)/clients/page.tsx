import { Badge, Card, CardContent, CardHeader, CardTitle } from '@org/ui-kit';
import { fetchFromApi } from '../../../lib/api';
import type { Client } from '@org/shared-types';

export default async function ClientsPage() {
  const clients = await fetchFromApi<Client[]>('/api/clients');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <Card>
        <CardHeader>
          <CardTitle>{clients.length} total</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-neutral-500">No clients yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-100">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2">
                      <Badge tone={c.status === 'active' ? 'open' : 'canceled'}>{c.status}</Badge>
                    </td>
                    <td className="py-2 text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
