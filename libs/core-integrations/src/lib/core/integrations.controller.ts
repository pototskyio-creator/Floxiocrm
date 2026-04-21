import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '@org/core-crm';
import { IntegrationsService } from './integrations.service.js';

const installBody = z.object({
  kind: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  // Config is adapter-specific — the service runs the per-kind Zod schema.
  // Defaulted to {} so the service-layer type doesn't see an optional field.
  config: z.unknown().default({}),
});
type InstallBody = z.infer<typeof installBody>;

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list() {
    return this.integrations.list();
  }

  @Get('kinds')
  kinds() {
    return this.integrations.listKinds();
  }

  @Post()
  install(@Body(new ZodValidationPipe(installBody)) body: InstallBody) {
    return this.integrations.install(body);
  }

  @Post(':id/test')
  test(@Param('id', ParseUUIDPipe) id: string) {
    return this.integrations.test(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async uninstall(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.integrations.uninstall(id);
  }
}
