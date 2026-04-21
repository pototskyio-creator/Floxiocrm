import { Global, Module } from '@nestjs/common';
import { CryptoService } from './core/crypto.service.js';
import { IntegrationRegistry } from './core/integration-registry.service.js';
import {
  IntegrationInstancesAdminRepository,
  IntegrationInstancesRepository,
} from './core/integration-instances.repository.js';
import {
  NotificationsAdminRepository,
  NotificationsRepository,
} from './core/notifications.repository.js';
import { NotificationsController } from './core/notifications.controller.js';
import { IntegrationsService } from './core/integrations.service.js';
import { IntegrationsController } from './core/integrations.controller.js';
import { DeliveryService } from './core/delivery.service.js';
import { InAppAdapterModule } from './adapters/in-app/in-app.module.js';
import { TelegramAdapterModule } from './adapters/telegram/telegram.module.js';
import { WebhookAdapterModule } from './adapters/webhook/webhook.module.js';
import { ImapAdapterModule } from './adapters/imap/imap.module.js';

// Global so adapter modules (In-App, Telegram, Webhook, IMAP, ...) can inject
// IntegrationRegistry + NotificationsAdminRepository + CryptoService without
// re-importing this module explicitly.
@Global()
@Module({
  imports: [InAppAdapterModule, TelegramAdapterModule, WebhookAdapterModule, ImapAdapterModule],
  controllers: [IntegrationsController, NotificationsController],
  providers: [
    CryptoService,
    IntegrationRegistry,
    IntegrationInstancesRepository,
    IntegrationInstancesAdminRepository,
    NotificationsAdminRepository,
    NotificationsRepository,
    IntegrationsService,
    DeliveryService,
  ],
  exports: [
    CryptoService,
    IntegrationRegistry,
    IntegrationInstancesRepository,
    IntegrationInstancesAdminRepository,
    NotificationsAdminRepository,
    NotificationsRepository,
    IntegrationsService,
    DeliveryService,
    InAppAdapterModule,
    TelegramAdapterModule,
    WebhookAdapterModule,
    ImapAdapterModule,
  ],
})
export class CoreIntegrationsModule {}
