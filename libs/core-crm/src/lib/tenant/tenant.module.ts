import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context.service.js';

// Exports TenantContext so any module can inject it. The scope is entered
// by SessionMiddleware in @org/core-auth (Д2+). Earlier header-based
// middleware was removed once real auth landed.
@Global()
@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class TenantModule {}
