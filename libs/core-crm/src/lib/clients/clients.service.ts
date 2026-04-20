import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateClientDto, ListClientsQuery, UpdateClientDto } from '@org/shared-types';
import { ClientsRepository } from './clients.repository.js';

@Injectable()
export class ClientsService {
  constructor(private readonly repo: ClientsRepository) {}

  list(q: ListClientsQuery) {
    return this.repo.list(q);
  }

  async get(id: string) {
    const row = await this.repo.findById(id);
    if (!row || row.deletedAt) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return row;
  }

  create(dto: CreateClientDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateClientDto) {
    const row = await this.repo.update(id, dto);
    if (!row) throw new NotFoundException(`Client ${id} not found`);
    return row;
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.softDelete(id);
    if (!res) throw new NotFoundException(`Client ${id} not found or already deleted`);
  }
}
