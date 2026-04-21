import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, type ReminderJob } from './queues.js';
import { RedisService } from './redis.service.js';

// Producer-side handle to the reminders queue. Workers import this too and
// rely on the same queue name; they create their own `Worker` against it.
@Injectable()
export class RemindersQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RemindersQueueService.name);
  private _queue: Queue<ReminderJob> | null = null;

  constructor(private readonly redis: RedisService) {}

  get queue(): Queue<ReminderJob> {
    if (!this._queue) {
      this._queue = new Queue<ReminderJob>(QUEUE_NAMES.reminders, {
        connection: this.redis.connection,
      });
    }
    return this._queue;
  }

  // Schedules a single delayed job. `fireAt` in the past → delay 0 (fires asap).
  async schedule(job: ReminderJob, fireAt: Date): Promise<string> {
    const delay = Math.max(0, fireAt.getTime() - Date.now());
    const added = await this.queue.add(
      `reminder:${job.reminderId}`,
      job,
      {
        delay,
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      }
    );
    if (!added.id) throw new Error('BullMQ did not return a job id');
    this.logger.debug(`Scheduled reminder ${job.reminderId} in ${delay}ms (jobId=${added.id})`);
    return added.id;
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }

  async onModuleDestroy(): Promise<void> {
    if (this._queue) {
      await this._queue.close();
      this._queue = null;
    }
  }
}
