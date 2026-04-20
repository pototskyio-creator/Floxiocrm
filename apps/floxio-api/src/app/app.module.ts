import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreCrmModule, TenantContextMiddleware } from '@org/core-crm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CoreCrmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Every route except the root health-check requires tenant context.
    // Auth (Д2) will layer on top and derive tenant from session instead of header.
    consumer
      .apply(TenantContextMiddleware)
      .exclude('', 'api', 'api/health')
      .forRoutes('*');
  }
}
