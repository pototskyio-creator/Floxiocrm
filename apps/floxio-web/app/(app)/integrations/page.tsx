import { fetchFromApi } from '../../../lib/api';
import { IntegrationsClient } from './integrations-client';

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

export default async function IntegrationsPage() {
  const [instances, kinds] = await Promise.all([
    fetchFromApi<InstanceRow[]>('/api/integrations'),
    fetchFromApi<KindRow[]>('/api/integrations/kinds'),
  ]);
  return <IntegrationsClient instances={instances} kinds={kinds} />;
}
