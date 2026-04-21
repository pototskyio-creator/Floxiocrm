import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CryptoService } from './crypto.service.js';
import { IntegrationRegistry } from './integration-registry.service.js';
import { IntegrationInstancesRepository } from './integration-instances.repository.js';

// Tenant-scoped CRUD for integration instances. Validates config against the
// adapter's Zod schema, encrypts via CryptoService, and optionally calls the
// adapter's check() as a smoke test before the record is considered active.
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly repo: IntegrationInstancesRepository,
    private readonly registry: IntegrationRegistry,
    private readonly crypto: CryptoService
  ) {}

  list() {
    return this.repo.list();
  }

  listKinds() {
    return this.registry.list().map((a) => ({
      kind: a.kind,
      displayName: a.displayName,
      supportsDeliver: typeof a.deliver === 'function',
      supportsPoll: typeof a.poll === 'function',
    }));
  }

  async install(input: { kind: string; name: string; config: unknown }) {
    const adapter = this.registry.get(input.kind);
    const parsed = adapter.configSchema.safeParse(input.config ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        message: `Invalid config for kind=${input.kind}`,
        issues: parsed.error.issues,
      });
    }

    const inst = await this.repo.create({
      kind: input.kind,
      name: input.name,
      config: Object.keys(parsed.data as object).length
        ? this.crypto.encryptJson(parsed.data)
        : null,
    });

    // Best-effort health check — failures are recorded but don't block install.
    if (adapter.check) {
      try {
        const res = await adapter.check(parsed.data);
        await this.repo.setError(inst.id, res.ok ? null : (res.detail ?? 'check failed'));
      } catch (err) {
        await this.repo.setError(inst.id, (err as Error).message);
      }
    }
    return inst;
  }

  async uninstall(id: string): Promise<void> {
    const res = await this.repo.softDelete(id);
    if (!res) throw new NotFoundException(`Integration ${id} not found`);
  }

  async test(id: string): Promise<{ ok: boolean; detail?: string }> {
    const inst = await this.repo.findById(id);
    if (!inst || inst.deletedAt) throw new NotFoundException(`Integration ${id} not found`);
    const adapter = this.registry.get(inst.kind);
    if (!adapter.check) return { ok: true, detail: 'adapter has no check()' };
    const config = inst.config ? this.crypto.decryptJson(inst.config) : {};
    const res = await adapter.check(config);
    await this.repo.setError(inst.id, res.ok ? null : (res.detail ?? 'check failed'));
    return res;
  }
}
