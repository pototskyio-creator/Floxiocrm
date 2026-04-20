import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionMiddleware } from './session.middleware.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionMiddleware],
  exports: [AuthService, SessionMiddleware],
})
export class CoreAuthModule {}
