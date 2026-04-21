import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  createProjectDtoSchema,
  listProjectsQuerySchema,
  moveProjectDtoSchema,
  updateProjectDtoSchema,
  type CreateProjectDto,
  type ListProjectsQuery,
  type MoveProjectDto,
  type UpdateProjectDto,
} from '@org/shared-types';
import { ZodValidationPipe } from '../util/zod-validation.pipe.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) q: ListProjectsQuery
  ) {
    return this.projects.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProjectDtoSchema)) body: CreateProjectDto
  ) {
    return this.projects.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProjectDtoSchema)) body: UpdateProjectDto
  ) {
    return this.projects.update(id, body);
  }

  @Post(':id/move')
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moveProjectDtoSchema)) body: MoveProjectDto
  ) {
    return this.projects.move(id, body.stageId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projects.remove(id);
  }
}
