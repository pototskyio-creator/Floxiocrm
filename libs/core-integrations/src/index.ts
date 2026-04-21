export { CoreIntegrationsModule } from './lib/core-integrations.module.js';

// Contract + core services.
export {
  INTEGRATION_ADAPTERS,
  type IntegrationAdapter,
  type DeliveryPayload,
} from './lib/core/adapter.contract.js';
export { IntegrationRegistry } from './lib/core/integration-registry.service.js';
export { CryptoService } from './lib/core/crypto.service.js';
export { DeliveryService } from './lib/core/delivery.service.js';
export { IntegrationsService } from './lib/core/integrations.service.js';
export {
  IntegrationInstancesRepository,
  IntegrationInstancesAdminRepository,
} from './lib/core/integration-instances.repository.js';
export { NotificationsAdminRepository } from './lib/core/notifications.repository.js';

// Adapters.
export { InAppAdapterModule } from './lib/adapters/in-app/in-app.module.js';
export { InAppAdapter } from './lib/adapters/in-app/in-app.adapter.js';
export { TelegramAdapterModule } from './lib/adapters/telegram/telegram.module.js';
export { TelegramAdapter } from './lib/adapters/telegram/telegram.adapter.js';
