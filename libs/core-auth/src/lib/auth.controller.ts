import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AuthService } from './auth.service.js';

// Catch-all for Better Auth's endpoints under /api/auth/*.
// Better Auth's Node handler consumes the IncomingMessage directly; if the
// global NestJS body parser already read it, Better Auth re-serializes from
// req.body. No extra wiring needed.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('{*splat}')
  handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    return toNodeHandler(this.authService.auth)(req, res);
  }
}
