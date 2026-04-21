import { Module } from '@nestjs/common';
import { CoreCrmModule } from '@org/core-crm';
import { CoreIntegrationsModule } from '@org/core-integrations';
import { RemindersProcessor } from './reminders.processor';
import { ImapPollerProcessor } from './imap-poller.processor';

@Module({
  imports: [CoreCrmModule, CoreIntegrationsModule],
  providers: [RemindersProcessor, ImapPollerProcessor],
})
export class WorkerModule {}
