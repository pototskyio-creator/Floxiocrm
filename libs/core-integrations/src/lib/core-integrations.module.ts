import { Global, Module } from '@nestjs/common';
import { CryptoService } from './core/crypto.service.js';
import { IntegrationRegistry } from './core/integration-registry.service.js';
import {
  IntegrationInstancesAdminRepository,
  IntegrationInstancesRepository,
} from './core/integration-instances.repository.js';
import { NotificationsAdminRepository } from './core/notifications.repository.js';
import { IntegrationsService } from './core/integrations.service.js';
import { IntegrationsController } from './core/integrations.controller.js';
import { DeliveryService } from './core/delivery.service.js';
import { InAppAdapterModule } from './adapters/in-app/in-app.module.js';
import { TelegramAdapterModule } from './adapters/telegram/telegram.module.js';

// Global so adapter modules (InAppAdapterModule, TelegramAdapterModule, and
// future IMAP/...) can inject IntegrationRegistry + NotificationsAdminRepository
// + CryptoService without re-importing this module explicitly.
@Global()
@Module({
  imports: [InAppAdapterModule, TelegramAdapterModule],
  controllers: [IntegrationsController],
  providers: [
    CryptoService,
    IntegrationRegistry,
    IntegrationInstancesRepository,
    IntegrationInstancesAdminRepository,
    NotificationsAdminRepository,
    IntegrationsService,
    DeliveryService,
  ],
  exports: [
    CryptoService,
    IntegrationRegistry,
    IntegrationInstancesRepository,
    IntegrationInstancesAdminRepository,
    NotificationsAdminRepository,
    IntegrationsService,
    DeliveryService,
    InAppAdapterModule,
    TelegramAdapterModule,
  ],
})
export class CoreIntegrationsModule {}
