import { Injectable, Logger } from '@nestjs/common';
import { RemindersQueueService } from '@org/core-jobs';
import type { ReminderChannel } from '@org/shared-types';
import { RemindersRepository } from './reminders.repository.js';
import { TenantContext } from '../tenant/tenant-context.service.js';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly repo: RemindersRepository,
    private readonly queue: RemindersQueueService,
    private readonly tenant: TenantContext
  ) {}

  // Creates a DB row + enqueues a delayed BullMQ job. The row and the job
  // track each other via `reminders.job_id`. If the enqueue fails, the row
  // stays in 'pending' with jobId=null — a future sweeper job can reconcile.
  async schedule(input: {
    taskId: string;
    fireAt: Date;
    channel?: ReminderChannel;
  }) {
    const reminder = await this.repo.create({
      taskId: input.taskId,
      fireAt: input.fireAt,
      channel: input.channel ?? 'in_app',
    });

    const jobId = await this.queue.schedule(
      { reminderId: reminder.id, tenantId: this.tenant.getTenantId() },
      input.fireAt
    );
    await this.repo.setJobId(reminder.id, jobId);
    this.logger.debug(
      `Reminder ${reminder.id} scheduled for task ${input.taskId} at ${input.fireAt.toISOString()}`
    );
    return { ...reminder, jobId };
  }

  listByTask(taskId: string) {
    return this.repo.listByTask(taskId);
  }

  get(id: string) {
    return this.repo.findById(id);
  }
}
