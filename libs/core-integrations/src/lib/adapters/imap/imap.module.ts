import { Module } from '@nestjs/common';
import { ClientsModule } from '@org/core-crm';
import { ImapAdapter } from './imap.adapter.js';
import {
  InboxMessagesAdminRepository,
  InboxMessagesRepository,
} from './inbox-messages.repository.js';
import { InboxMessagesController } from './inbox-messages.controller.js';

// Self-registering inbound IMAP adapter. Needs ClientsModule for the admin
// client-by-email lookup during polling (auto-link sender to a client).
@Module({
  imports: [ClientsModule],
  controllers: [InboxMessagesController],
  providers: [ImapAdapter, InboxMessagesAdminRepository, InboxMessagesRepository],
  exports: [ImapAdapter, InboxMessagesAdminRepository, InboxMessagesRepository],
})
export class ImapAdapterModule {}
