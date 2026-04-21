import { Module } from '@nestjs/common';
import { RemindersAdminRepository, RemindersRepository } from './reminders.repository.js';
import { RemindersService } from './reminders.service.js';

@Module({
  providers: [RemindersService, RemindersRepository, RemindersAdminRepository],
  exports: [RemindersService, RemindersRepository, RemindersAdminRepository],
})
export class RemindersModule {}
