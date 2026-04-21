import { Module } from '@nestjs/common';
import { TelegramAdapter } from './telegram.adapter.js';

// Self-registering adapter module. Imported by CoreIntegrationsModule so
// consumers get Telegram outbound delivery automatically.
@Module({
  providers: [TelegramAdapter],
  exports: [TelegramAdapter],
})
export class TelegramAdapterModule {}
