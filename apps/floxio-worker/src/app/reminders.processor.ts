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

// Subscribes to the reminders queue and fires each due reminder.
// Delivery channels (Telegram/email) are wired in Д7+ — for now we mark the
// reminder as `fired` and log the payload.
@Injectable()
export class RemindersProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RemindersProcessor.name);
  private worker: Worker<ReminderJob> | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly remindersAdmin: RemindersAdminRepository
  ) {}

  onApplicationBootstrap(): void {
    this.worker = new Worker<ReminderJob>(
      QUEUE_NAMES.reminders,
      (job) => this.handle(job),
      { connection: this.redis.connection, concurrency: 5 }
    );

    this.worker.on('ready', () => this.logger.log('Reminders worker ready'));
    this.worker.on('completed', (job) =>
      this.logger.debug(`Job ${job.id} completed`)
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id} failed: ${err?.message}`, err?.stack)
    );
  }

  private async handle(job: Job<ReminderJob>): Promise<void> {
    const { reminderId, tenantId } = job.data;
    const reminder = await this.remindersAdmin.findByIdAdmin(reminderId);

    if (!reminder) {
      this.logger.warn(`Reminder ${reminderId} not found — skipping`);
      return;
    }
    if (reminder.status !== 'pending') {
      this.logger.debug(
        `Reminder ${reminderId} already ${reminder.status} — skipping`
      );
      return;
    }

    // Д7 will dispatch via the matching IntegrationAdapter. For now, log.
    this.logger.log(
      `FIRING reminder ${reminderId} (tenant=${tenantId}, channel=${reminder.channel}, task=${reminder.taskId})`
    );

    await this.remindersAdmin.markFired(reminderId);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
