import { Module } from '@nestjs/common';
import { RemindersModule } from '../reminders/reminders.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { TasksAdminRepository, TasksRepository } from './tasks.repository.js';

@Module({
  imports: [RemindersModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TasksAdminRepository],
  exports: [TasksService, TasksAdminRepository],
})
export class TasksModule {}
