import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId: string;
}

// Request-scoped tenant context backed by AsyncLocalStorage.
// The TenantContextMiddleware is responsible for entering the scope.
@Injectable()
export class TenantContext {
  readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(tenantId: string, cb: () => T): T {
    return this.als.run({ tenantId }, cb);
  }

  getTenantId(): string {
    const store = this.als.getStore();
    if (!store) {
      throw new Error(
        'TenantContext: no tenant in scope. Did the request go through TenantContextMiddleware?'
      );
    }
    return store.tenantId;
  }
}
