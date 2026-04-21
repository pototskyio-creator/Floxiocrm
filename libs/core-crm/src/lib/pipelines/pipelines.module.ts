import { Module } from '@nestjs/common';
import { PipelinesController } from './pipelines.controller.js';
import { PipelinesService } from './pipelines.service.js';
import { PipelinesRepository } from './pipelines.repository.js';

@Module({
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelinesRepository],
  // Export the repo so ProjectsService can resolve default pipeline/stage.
  exports: [PipelinesService, PipelinesRepository],
})
export class PipelinesModule {}
