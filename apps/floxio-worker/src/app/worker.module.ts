import { Module } from '@nestjs/common';
import { CoreCrmModule } from '@org/core-crm';
import { RemindersProcessor } from './reminders.processor';

@Module({
  imports: [CoreCrmModule],
  providers: [RemindersProcessor],
})
export class WorkerModule {}
