import { Controller, Get } from '@nestjs/common';
import { PipelinesService } from './pipelines.service.js';

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  // Read-only for Д3. Editing pipelines/stages comes in a later iteration.
  @Get()
  list() {
    return this.pipelines.list();
  }
}
