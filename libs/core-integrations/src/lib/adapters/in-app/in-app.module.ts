import { Module } from '@nestjs/common';
import { InAppAdapter } from './in-app.adapter.js';

// Provides InAppAdapter. The adapter self-registers with IntegrationRegistry
// in its OnModuleInit hook — no extra wiring required from consumers.
@Module({
  providers: [InAppAdapter],
  exports: [InAppAdapter],
})
export class InAppAdapterModule {}
