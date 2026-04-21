import { Module } from '@nestjs/common';
import { CoreCrmModule } from '@org/core-crm';
import { CoreIntegrationsModule } from '@org/core-integrations';
import { RemindersProcessor } from './reminders.processor';

@Module({
  imports: [CoreCrmModule, CoreIntegrationsModule],
  providers: [RemindersProcessor],
})
export class WorkerModule {}
