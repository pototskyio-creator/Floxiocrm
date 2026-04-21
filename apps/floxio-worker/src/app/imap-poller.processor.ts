import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import {
  CryptoService,
  IntegrationInstancesAdminRepository,
  IntegrationRegistry,
} from '@org/core-integrations';
import { QUEUE_NAMES, RedisService, type ImapPollJob } from '@org/core-jobs';

// The adapter instance we need is `ImapAdapter`, but importing it directly
// (by class) from the @org/core-integrations barrel collided with TypeScript's
// emitDecoratorMetadata under webpack bundling — the reflected type came in
// as `Object`, tripping Nest's DI. Resolving by kind through the registry
// sidesteps that chain and mirrors how DeliveryService calls adapters.
interface PollableAdapter {
  readonly kind: string;
  readonly configSchema: { parse(value: unknown): Record<string, unknown> };
  pollWithContext(
    config: Record<string, unknown>,
    ctx: { tenantId: string; integrationInstanceId: string }
  ): Promise<{ fetched: number; matched: number }>;
}

// Drives periodic IMAP polling. At bootstrap:
//   1. creates/updates a repeating scheduler on the imap-polling queue,
//   2. starts a Worker that, on each tick, enumerates active imap
//      instances across tenants and calls ImapAdapter.pollWithContext().
// The queue is the trigger; the Worker does the fan-out in admin mode.
@Injectable()
export class ImapPollerProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ImapPollerProcessor.name);
  private worker: Worker<ImapPollJob> | null = null;
  private queue: Queue<ImapPollJob> | null = null;

  // Interval between polls (ms). Override via IMAP_POLL_INTERVAL_MS.
  private get intervalMs(): number {
    const raw = process.env.IMAP_POLL_INTERVAL_MS;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000; // default 2 minutes
  }

  constructor(
    private readonly redis: RedisService,
    private readonly instances: IntegrationInstancesAdminRepository,
    private readonly registry: IntegrationRegistry,
    private readonly crypto: CryptoService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.queue = new Queue<ImapPollJob>(QUEUE_NAMES.imapPolling, {
      connection: this.redis.connection,
    });

    // BullMQ v5 scheduler — one named schedule, idempotent on startup.
    await this.queue.upsertJobScheduler(
      'imap-poll-all',
      { every: this.intervalMs, immediately: true },
      { name: 'imap-poll-all', data: {} as ImapPollJob, opts: { removeOnComplete: 100, removeOnFail: 200 } }
    );

    this.worker = new Worker<ImapPollJob>(
      QUEUE_NAMES.imapPolling,
      () => this.handleTick(),
      { connection: this.redis.connection, concurrency: 1 }
    );
    this.worker.on('ready', () => this.logger.log(`IMAP poller ready (every ${this.intervalMs}ms)`));
    this.worker.on('failed', (job, err) =>
      this.logger.error(`IMAP poller job ${job?.id} failed: ${err?.message}`, err?.stack)
    );
  }

  private async handleTick(): Promise<void> {
    if (!this.registry.has('imap')) return;
    const adapter = this.registry.get('imap') as unknown as PollableAdapter;

    const active = await this.instances.findAllActiveByKind('imap');
    if (active.length === 0) return;

    for (const inst of active) {
      try {
        const raw = inst.config ? this.crypto.decryptJson<Record<string, unknown>>(inst.config) : null;
        if (!raw) {
          await this.instances.markCheckedAdmin(inst.id, 'missing config');
          continue;
        }
        const config = adapter.configSchema.parse(raw);
        const { fetched, matched } = await adapter.pollWithContext(config, {
          tenantId: inst.tenantId,
          integrationInstanceId: inst.id,
        });
        await this.instances.markCheckedAdmin(inst.id, null);
        if (fetched > 0) {
          this.logger.log(
            `imap poll ok tenant=${inst.tenantId} fetched=${fetched} matched=${matched}`
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`imap poll failed for instance=${inst.id}: ${msg}`);
        await this.instances.markCheckedAdmin(inst.id, msg.slice(0, 2000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}
