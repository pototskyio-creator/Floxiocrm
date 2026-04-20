import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createAuth, type AuthInstance } from './auth.js';

// Singleton wrapper so the Better Auth instance is constructed once and
// shared across controllers/middleware via NestJS DI.
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private _auth: AuthInstance | null = null;

  onModuleInit(): void {
    this._auth = createAuth();
    this.logger.log('Better Auth initialized');
  }

  get auth(): AuthInstance {
    if (!this._auth) throw new Error('AuthService used before onModuleInit');
    return this._auth;
  }
}
