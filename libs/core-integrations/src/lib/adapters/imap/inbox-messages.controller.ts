import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '@org/core-crm';
import { InboxMessagesRepository } from './inbox-messages.repository.js';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
type ListQuery = z.infer<typeof listQuery>;

@Controller('inbox-messages')
export class InboxMessagesController {
  constructor(private readonly repo: InboxMessagesRepository) {}

  @Get()
  list(@Query(new ZodValidationPipe(listQuery)) q: ListQuery) {
    return this.repo.list(q);
  }

  @Post(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.repo.markRead(id);
  }
}
