import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateTaskDto,
  ListTasksQuery,
  UpdateTaskDto,
} from '@org/shared-types';
import { TasksRepository } from './tasks.repository.js';
import { RemindersService } from '../reminders/reminders.service.js';

@Injectable()
export class TasksService {
  constructor(
    private readonly repo: TasksRepository,
    private readonly reminders: RemindersService
  ) {}

  list(q: ListTasksQuery) {
    return this.repo.list(q);
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row || row.deletedAt) throw new NotFoundException(`Task ${id} not found`);
    return row;
  }

  async create(dto: CreateTaskDto) {
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const task = await this.repo.create({
      title: dto.title,
      description: dto.description ?? null,
      clientId: dto.clientId ?? null,
      projectId: dto.projectId ?? null,
      assigneeUserId: dto.assigneeUserId ?? null,
      dueAt,
    });

    // Optional auto-reminder. Caller must provide both `dueAt` and `reminder`.
    // The reminder fires at `dueAt + offsetSeconds` (positive offset = before due).
    if (dueAt && dto.reminder) {
      const fireAt = new Date(dueAt.getTime() - dto.reminder.offsetSeconds * 1000);
      await this.reminders.schedule({
        taskId: task.id,
        fireAt,
        channel: dto.reminder.channel,
      });
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const row = await this.repo.update(id, dto);
    if (!row) throw new NotFoundException(`Task ${id} not found`);
    return row;
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.softDelete(id);
    if (!res) throw new NotFoundException(`Task ${id} not found or already deleted`);
  }
}
