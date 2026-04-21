import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import {
  RedisService,
  QUEUE_NAMES,
  type ReminderJob,
} from '@org/core-jobs';
import { RemindersAdminRepository } from '@org/core-crm';
import { DeliveryService } from '@org/core-integrations';

// Picks up each due reminder, dispatches the delivery through the integration
// registry by channel, and stamps fired/failed on the row. Actual delivery
// semantics live in the adapter — worker only orchestrates.
@Injectable()
export class RemindersProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RemindersProcessor.name);
  private worker: Worker<ReminderJob> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly remindersAdmin: RemindersAdminRepository,
    private readonly delivery: DeliveryService
  ) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker<ReminderJob>(
      QUEUE_NAMES.reminders,
      (job) => this.handle(job),
      { connection: this.redis.connection, concurrency: 5 }
    );

    this.worker.on('ready', () => this.logger.log('Reminders worker ready'));
    this.worker.on('completed', (job) => this.logger.debug(`Job ${job.id} completed`));
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id} failed: ${err?.message}`, err?.stack)
    );
  }

  private async handle(job: Job<ReminderJob>): Promise<void> {
    const { reminderId } = job.data;
    const row = await this.remindersAdmin.findWithTaskAdmin(reminderId);
    if (!row) {
      this.logger.warn(`Reminder ${reminderId} or its task not found — skipping`);
      return;
    }
    const { reminder, task } = row;
    if (reminder.status !== 'pending') {
      this.logger.debug(`Reminder ${reminderId} already ${reminder.status} — skipping`);
      return;
    }

    try {
      await this.delivery.deliver(reminder.channel, {
        tenantId: reminder.tenantId,
        title: task.title,
        body: task.description,
        recipientUserId: task.assigneeUserId,
        sourceKind: 'task',
        sourceId: task.id,
      });
      await this.remindersAdmin.markFired(reminderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.remindersAdmin.markFailed(reminderId, msg);
      // Re-throw so BullMQ's retry/backoff kicks in for transient errors.
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
