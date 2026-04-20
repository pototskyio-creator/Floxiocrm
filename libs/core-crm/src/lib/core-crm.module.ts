import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { ClientsModule } from './clients/clients.module.js';

// CoreCrmModule bundles the infrastructure (DB, tenant context) and the Clients
// feature module. Per-client apps import this once in their root module.
@Module({
  imports: [DbModule, TenantModule, ClientsModule],
  exports: [DbModule, TenantModule, ClientsModule],
})
export class CoreCrmModule {}
