import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { PipelinesModule } from './pipelines/pipelines.module.js';
import { ProjectsModule } from './projects/projects.module.js';

// CoreCrmModule bundles the infrastructure (DB, tenant context) and the domain
// feature modules. Per-client apps import this once in their root module.
@Module({
  imports: [DbModule, TenantModule, ClientsModule, PipelinesModule, ProjectsModule],
  exports: [DbModule, TenantModule, ClientsModule, PipelinesModule, ProjectsModule],
})
export class CoreCrmModule {}
