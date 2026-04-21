import { Injectable } from '@nestjs/common';
import { CryptoService } from './crypto.service.js';
import { IntegrationRegistry } from './integration-registry.service.js';
import { IntegrationInstancesAdminRepository } from './integration-instances.repository.js';
import type { DeliveryPayload } from './adapter.contract.js';

// Worker-side dispatcher. Given a channel + payload it:
//   1. looks up the tenant's active integration instance for that channel,
//   2. decrypts its config,
//   3. asks the matching adapter from the registry to deliver.
// Intentionally uses the admin repo — the worker has no user session.
@Injectable()
export class DeliveryService {
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly instances: IntegrationInstancesAdminRepository,
    private readonly crypto: CryptoService
  ) {}

  async deliver(channel: string, payload: DeliveryPayload): Promise<void> {
    if (!this.registry.has(channel)) {
      throw new Error(`No adapter registered for channel=${channel}`);
    }
    const adapter = this.registry.get(channel);
    if (!adapter.deliver) {
      throw new Error(`Adapter kind=${channel} does not support deliver()`);
    }

    const inst = await this.instances.findActiveForTenant(payload.tenantId, channel);
    if (!inst) {
      throw new Error(
        `No active integration instance for tenant=${payload.tenantId} kind=${channel}`
      );
    }
    const config = inst.config ? this.crypto.decryptJson(inst.config) : {};
    await adapter.deliver(config, payload);
  }
}
