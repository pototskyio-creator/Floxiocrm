import type { ZodType } from 'zod';

// Shape of a delivery payload routed through any adapter. Adapters MAY ignore
// fields they don't support (e.g. in_app has no recipient id).
export interface DeliveryPayload {
  tenantId: string;
  title: string;
  body?: string | null;
  recipientUserId?: string | null;
  // Loose link back to the domain entity that triggered the delivery.
  sourceKind?: 'task' | 'reminder' | 'project' | 'manual' | string;
  sourceId?: string | null;
}

// Adapter contract. Implementations live under libs/core-integrations/adapters/<kind>/.
// `configSchema` is a Zod schema for the adapter's per-instance config;
// the registry validates incoming configs against it before persisting.
// `deliver` is optional — some adapters only poll (e.g. IMAP inbound).
// `poll` is optional — only inbound channels implement it.
export interface IntegrationAdapter<TConfig = unknown> {
  readonly kind: string;
  readonly displayName: string;
  readonly configSchema: ZodType<TConfig>;
  deliver?(config: TConfig, payload: DeliveryPayload): Promise<void>;
  poll?(config: TConfig): Promise<void>;
  // Health check — registry calls this when an instance is created or tested.
  check?(config: TConfig): Promise<{ ok: boolean; detail?: string }>;
}

// Injection token for the array of all registered adapters. Adapters register
// by providing themselves under this multi-provider token in their module.
export const INTEGRATION_ADAPTERS = Symbol('INTEGRATION_ADAPTERS');
