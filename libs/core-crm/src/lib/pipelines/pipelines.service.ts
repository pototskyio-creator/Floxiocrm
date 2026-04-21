import { Injectable } from '@nestjs/common';
import { PipelinesRepository } from './pipelines.repository.js';

@Injectable()
export class PipelinesService {
  constructor(private readonly repo: PipelinesRepository) {}

  list() {
    return this.repo.listWithStages();
  }
}
