import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { IntegrationAdapter } from './adapter.contract.js';

// Mutable runtime registry of adapter instances. Adapter classes implement
// OnModuleInit and call registry.register(this) from there — Nest's multi-
// provider DI quirks (there's no equivalent of Angular's useMulti) are
// sidestepped with an explicit imperative hand-off at bootstrap.
@Injectable()
export class IntegrationRegistry {
  private readonly logger = new Logger(IntegrationRegistry.name);
  private readonly byKind = new Map<string, IntegrationAdapter>();

  register(adapter: IntegrationAdapter): void {
    if (this.byKind.has(adapter.kind)) {
      throw new Error(`Duplicate IntegrationAdapter for kind="${adapter.kind}"`);
    }
    this.byKind.set(adapter.kind, adapter);
    this.logger.log(`Registered adapter kind="${adapter.kind}" (${adapter.displayName})`);
  }

  list(): IntegrationAdapter[] {
    return [...this.byKind.values()];
  }

  has(kind: string): boolean {
    return this.byKind.has(kind);
  }

  get(kind: string): IntegrationAdapter {
    const a = this.byKind.get(kind);
    if (!a) throw new NotFoundException(`Unknown integration kind: ${kind}`);
    return a;
  }
}
