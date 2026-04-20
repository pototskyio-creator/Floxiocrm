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
  createClientDtoSchema,
  listClientsQuerySchema,
  updateClientDtoSchema,
  type CreateClientDto,
  type ListClientsQuery,
  type UpdateClientDto,
} from '@org/shared-types';
import { ZodValidationPipe } from '../util/zod-validation.pipe.js';
import { ClientsService } from './clients.service.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listClientsQuerySchema)) q: ListClientsQuery
  ) {
    return this.clients.list(q);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createClientDtoSchema)) body: CreateClientDto
  ) {
    return this.clients.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateClientDtoSchema)) body: UpdateClientDto
  ) {
    return this.clients.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.clients.remove(id);
  }
}
