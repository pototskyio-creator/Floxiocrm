import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { DeliveryPayload, IntegrationAdapter } from '../../core/adapter.contract.js';
import { IntegrationRegistry } from '../../core/integration-registry.service.js';

// Inbound-only webhook adapter. An external system posts JSON to
// /api/webhooks/:instanceId; the WebhooksController looks up the instance,
// asks this adapter to verify the signature, then hands the parsed payload
// back for entity creation.
//
// Signature scheme: HMAC-SHA256 of the raw request body, hex-encoded, sent
// as `x-floxio-signature`. No session auth — the shared secret is the only
// thing proving the caller knows the endpoint.
const entityKindSchema = z.enum(['client', 'task']);
export type WebhookEntityKind = z.infer<typeof entityKindSchema>;

const configSchema = z.object({
  secret: z.string().min(16).max(256),
  createEntity: entityKindSchema.default('client'),
});
type WebhookConfig = z.infer<typeof configSchema>;

// Payload envelope the adapter expects — thin on purpose, MVP uses just a
// name/title + optional notes. Expands as real use cases arrive.
const inboundPayloadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(10_000).optional(),
});
export type WebhookInboundPayload = z.infer<typeof inboundPayloadSchema>;

// What the adapter asks the controller to create after a successful decode.
export interface WebhookDecodeResult {
  entity: WebhookEntityKind;
  data: WebhookInboundPayload;
}

@Injectable()
export class WebhookAdapter implements IntegrationAdapter<WebhookConfig>, OnModuleInit {
  readonly kind = 'webhook';
  readonly displayName = 'Generic inbound webhook';
  readonly configSchema = configSchema;

  private readonly logger = new Logger(WebhookAdapter.name);

  constructor(private readonly registry: IntegrationRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  // Constant-time HMAC check against the raw body the controller captured.
  verifySignature(config: WebhookConfig, rawBody: string, header: string | undefined): boolean {
    if (!header) return false;
    const expected = createHmac('sha256', config.secret).update(rawBody).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const gotBuf = Buffer.from(header, 'utf8');
    if (expBuf.length !== gotBuf.length) return false;
    return timingSafeEqual(expBuf, gotBuf);
  }

  decode(config: WebhookConfig, body: unknown): WebhookDecodeResult {
    const parsed = inboundPayloadSchema.parse(body);
    return { entity: config.createEntity, data: parsed };
  }

  // No outbound delivery — this adapter is inbound-only. Leaving `deliver`
  // undefined makes the registry report supportsDeliver:false for kind=webhook.

  async check(config: WebhookConfig): Promise<{ ok: boolean; detail?: string }> {
    // Nothing to dial out to — HMAC is stateless. A non-empty secret is the
    // only invariant, and the Zod schema already enforces the minimum length.
    this.logger.debug(`webhook check passed (entity=${config.createEntity})`);
    return { ok: true, detail: `entity=${config.createEntity}` };
  }

  // Type-safe no-op implementation so DeliveryService's type guard still works
  // if someone accidentally routes a reminder to channel='webhook'.
  async deliver(_config: WebhookConfig, _payload: DeliveryPayload): Promise<void> {
    throw new Error('webhook adapter is inbound-only — use a different channel for reminders');
  }
}
