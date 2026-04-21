import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProjectDto,
  ListProjectsQuery,
  UpdateProjectDto,
} from '@org/shared-types';
import { ProjectsRepository } from './projects.repository.js';
import { PipelinesRepository } from '../pipelines/pipelines.repository.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly pipelines: PipelinesRepository
  ) {}

  list(q: ListProjectsQuery) {
    return this.repo.list(q);
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row || row.deletedAt) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return row;
  }

  async create(dto: CreateProjectDto) {
    // Resolve pipeline + stage — explicit values win, otherwise fall back to
    // the tenant's default pipeline and its first 'open' stage.
    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;

    if (!pipelineId || !stageId) {
      const def = await this.pipelines.findDefault();
      if (!def) {
        throw new BadRequestException(
          'No default pipeline for this tenant — provide pipelineId + stageId explicitly.'
        );
      }
      pipelineId = pipelineId ?? def.id;
      if (!stageId) {
        const first = await this.pipelines.firstOpenStage(pipelineId);
        if (!first) {
          throw new BadRequestException(
            `Pipeline ${pipelineId} has no open stages — provide stageId explicitly.`
          );
        }
        stageId = first.id;
      }
    }

    return this.repo.create({ ...dto, pipelineId, stageId });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const row = await this.repo.update(id, dto);
    if (!row) throw new NotFoundException(`Project ${id} not found`);
    return row;
  }

  async move(id: string, stageId: string) {
    try {
      const row = await this.repo.moveToStage(id, stageId);
      if (!row) throw new NotFoundException(`Project ${id} not found`);
      return row;
    } catch (err) {
      if (err instanceof Error && err.message.includes('does not belong')) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.softDelete(id);
    if (!res) throw new NotFoundException(`Project ${id} not found or already deleted`);
  }
}
