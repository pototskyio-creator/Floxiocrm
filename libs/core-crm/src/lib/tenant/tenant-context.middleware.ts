import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TenantContext } from './tenant-context.service.js';

const headerSchema = z.uuid();

// Reads x-tenant-id from the request and opens a TenantContext scope.
// TEMPORARY: in Д2 this will be replaced by a session-derived tenantId.
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly ctx: TenantContext) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header('x-tenant-id');
    const parsed = headerSchema.safeParse(header);
    if (!parsed.success) {
      throw new BadRequestException('Missing or invalid x-tenant-id header');
    }
    this.ctx.run(parsed.data, () => next());
  }
}
