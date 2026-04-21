import { Module } from '@nestjs/common';
import { ClientsModule, TasksModule } from '@org/core-crm';
import { WebhookAdapter } from './webhook.adapter.js';
import { WebhooksController } from './webhooks.controller.js';

// Self-registering inbound webhook adapter + public controller at
// /api/webhooks/:instanceId. Imports ClientsModule/TasksModule explicitly
// because the controller calls their admin repos to create entities on inbound —
// Nest DI won't find those across unrelated module subtrees otherwise.
@Module({
  imports: [ClientsModule, TasksModule],
  controllers: [WebhooksController],
  providers: [WebhookAdapter],
  exports: [WebhookAdapter],
})
export class WebhookAdapterModule {}
