import { notFound } from 'next/navigation';
import { fetchFromApi } from '../../../../lib/api';
import type { Client } from '@org/shared-types';
import { ClientEditor } from './client-editor';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const client = await fetchFromApi<Client>(`/api/clients/${id}`);
    return <ClientEditor client={client} />;
  } catch {
    notFound();
  }
}
