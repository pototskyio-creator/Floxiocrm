import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context.service.js';
import { TenantContextMiddleware } from './tenant-context.middleware.js';

// The middleware itself is provided here so consumers can `consumer.apply(TenantContextMiddleware)`
// from their root module without re-importing it from a deep path. Route wiring (forRoutes/exclude)
// is the consumer's responsibility — per-client apps vary.
@Global()
@Module({
  providers: [TenantContext, TenantContextMiddleware],
  exports: [TenantContext, TenantContextMiddleware],
})
export class TenantModule {}
