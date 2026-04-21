import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import type { DeliveryPayload, IntegrationAdapter } from '../../core/adapter.contract.js';
import { IntegrationRegistry } from '../../core/integration-registry.service.js';
import { NotificationsAdminRepository } from '../../core/notifications.repository.js';

// Reference adapter. 'in_app' is the built-in default channel every tenant
// installs automatically — it simply writes a row to `notifications` so the
// web UI can render an inbox. No external config.
const configSchema = z.object({}).passthrough();
type InAppConfig = z.infer<typeof configSchema>;

@Injectable()
export class InAppAdapter implements IntegrationAdapter<InAppConfig>, OnModuleInit {
  readonly kind = 'in_app';
  readonly displayName = 'In-app notifications';
  readonly configSchema = configSchema;

  private readonly logger = new Logger(InAppAdapter.name);

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly notifications: NotificationsAdminRepository
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async deliver(_config: InAppConfig, payload: DeliveryPayload): Promise<void> {
    await this.notifications.create({
      tenantId: payload.tenantId,
      channel: this.kind,
      title: payload.title,
      body: payload.body ?? null,
      recipientUserId: payload.recipientUserId ?? null,
      sourceKind: payload.sourceKind ?? null,
      sourceId: payload.sourceId ?? null,
    });
    this.logger.log(
      `in_app → tenant=${payload.tenantId} title="${payload.title}"`
    );
  }

  async check(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
