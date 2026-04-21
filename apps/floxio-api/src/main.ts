import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // rawBody:true keeps the original bytes on `req.rawBody` for HMAC checks
  // (inbound webhook signature verification). The parsed body is still
  // available as `req.body` for everything else.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS for the Next.js client. Credentials:true is required because auth
  // sessions ride in cookies; wildcard origin is not allowed with credentials.
  app.enableCors({
    origin: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  });

  const port = process.env.API_PORT || process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
