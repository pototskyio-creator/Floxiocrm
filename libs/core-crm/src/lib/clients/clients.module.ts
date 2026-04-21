import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { ClientsAdminRepository, ClientsRepository } from './clients.repository.js';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository, ClientsAdminRepository],
  exports: [ClientsService, ClientsAdminRepository],
})
export class ClientsModule {}
