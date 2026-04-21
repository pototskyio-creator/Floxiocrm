import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  createTaskDtoSchema,
  listTasksQuerySchema,
  updateTaskDtoSchema,
  type CreateTaskDto,
  type ListTasksQuery,
  type UpdateTaskDto,
} from '@org/shared-types';
import { ZodValidationPipe } from '../util/zod-validation.pipe.js';
import { TasksService } from './tasks.service.js';
import { RemindersService } from '../reminders/reminders.service.js';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly reminders: RemindersService
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listTasksQuerySchema)) q: ListTasksQuery
  ) {
    return this.tasks.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.get(id);
  }

  @Get(':id/reminders')
  listReminders(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminders.listByTask(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createTaskDtoSchema)) body: CreateTaskDto
  ) {
    return this.tasks.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTaskDtoSchema)) body: UpdateTaskDto
  ) {
    return this.tasks.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tasks.remove(id);
  }
}
