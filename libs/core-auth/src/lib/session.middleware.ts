import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { TenantContext } from '@org/core-crm';
import { AuthService } from './auth.service.js';

// Resolves the session for every non-auth, non-public route, populates
// req.user/req.session, and enters the TenantContext scope keyed by the
// session's active organization id.
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly tenant: TenantContext
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Belt-and-suspenders: never auth-gate the auth routes themselves. The
    // AppModule also excludes them, but this guards against a misconfigured
    // exclude() (Nest's path syntax varies between Express versions).
    if (req.originalUrl.startsWith('/api/auth/') || req.originalUrl === '/api/auth') {
      return next();
    }

    const result = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!result) {
      throw new UnauthorizedException('Authentication required');
    }

    const activeOrganizationId = result.session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new ForbiddenException(
        'No active organization on session. Create one via /api/auth/organization/create or set one via /api/auth/organization/set-active.'
      );
    }

    (req as Request & { user?: unknown; session?: unknown }).user = result.user;
    (req as Request & { user?: unknown; session?: unknown }).session = result.session;

    this.tenant.run(activeOrganizationId, () => next());
  }
}
