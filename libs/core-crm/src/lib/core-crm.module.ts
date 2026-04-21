import { Module } from '@nestjs/common';
import { CoreJobsModule } from '@org/core-jobs';
import { DbModule } from './db/db.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { PipelinesModule } from './pipelines/pipelines.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { StatsModule } from './stats/stats.module.js';

// CoreCrmModule bundles the infrastructure (DB, tenant context, jobs) and the
// domain feature modules. Per-client apps import this once in their root module.
@Module({
  imports: [
    CoreJobsModule,
    DbModule,
    TenantModule,
    ClientsModule,
    PipelinesModule,
    ProjectsModule,
    RemindersModule,
    TasksModule,
    StatsModule,
  ],
  exports: [
    CoreJobsModule,
    DbModule,
    TenantModule,
    ClientsModule,
    PipelinesModule,
    ProjectsModule,
    RemindersModule,
    TasksModule,
    StatsModule,
  ],
})
export class CoreCrmModule {}
