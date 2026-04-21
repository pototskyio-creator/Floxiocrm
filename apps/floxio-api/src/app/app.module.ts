import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { CoreCrmModule } from '@org/core-crm';
import { CoreAuthModule, SessionMiddleware } from '@org/core-auth';
import { CoreIntegrationsModule } from '@org/core-integrations';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CoreCrmModule, CoreAuthModule, CoreIntegrationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Session-derived tenant scope on every /api/* route except:
    //   - root health (AppController at /api)
    //   - Better Auth endpoints (they manage their own session cookies)
    consumer
      .apply(SessionMiddleware)
      .exclude(
        { path: '', method: RequestMethod.ALL },
        { path: 'api', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'api/auth/{*splat}', method: RequestMethod.ALL }
      )
      .forRoutes('*');
  }
}
