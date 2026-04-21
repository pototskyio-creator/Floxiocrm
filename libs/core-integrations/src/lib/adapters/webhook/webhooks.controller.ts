import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClientsAdminRepository, TasksAdminRepository } from '@org/core-crm';
import { CryptoService } from '../../core/crypto.service.js';
import {
  IntegrationInstancesAdminRepository,
} from '../../core/integration-instances.repository.js';
import { NotificationsAdminRepository } from '../../core/notifications.repository.js';
import { WebhookAdapter } from './webhook.adapter.js';

// Public, unauthenticated endpoint: `POST /api/webhooks/:instanceId`.
// Auth happens per-instance via an HMAC signature in `x-floxio-signature`.
// AppModule must exclude this path from SessionMiddleware.
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly instances: IntegrationInstancesAdminRepository,
    private readonly adapter: WebhookAdapter,
    private readonly crypto: CryptoService,
    private readonly notifications: NotificationsAdminRepository,
    private readonly clientsAdmin: ClientsAdminRepository,
    private readonly tasksAdmin: TasksAdminRepository
  ) {}

  @Post(':instanceId')
  @HttpCode(202)
  async handle(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: unknown
  ): Promise<{ accepted: true; entity: 'client' | 'task'; id: string }> {
    // findActiveForTenant is tenant-keyed, but we only have instanceId here.
    // Build a minimal admin lookup by id via the instances repo contract.
    const inst = await this.findInstance(instanceId);
    if (!inst || inst.kind !== 'webhook' || inst.deletedAt) {
      throw new NotFoundException(`Webhook instance ${instanceId} not found`);
    }

    const config = inst.config
      ? this.crypto.decryptJson<{ secret: string; createEntity: 'client' | 'task' }>(inst.config)
      : null;
    if (!config) throw new BadRequestException('Webhook instance has no config');

    const raw = req.rawBody?.toString('utf8') ?? '';
    const sig = req.header('x-floxio-signature');
    if (!this.adapter.verifySignature(config, raw, sig ?? undefined)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const decoded = this.adapter.decode(config, body);

    let createdId: string;
    if (decoded.entity === 'client') {
      const name = decoded.data.name ?? decoded.data.title;
      if (!name) throw new BadRequestException('Payload must include `name` or `title`');
      const row = await this.clientsAdmin.createAdmin({
        tenantId: inst.tenantId,
        name,
        notes: decoded.data.notes ?? null,
      });
      createdId = row.id;
    } else {
      const title = decoded.data.title ?? decoded.data.name;
      if (!title) throw new BadRequestException('Payload must include `title` or `name`');
      const row = await this.tasksAdmin.createAdmin({
        tenantId: inst.tenantId,
        title,
        description: decoded.data.notes ?? null,
      });
      createdId = row.id;
    }

    await this.notifications.create({
      tenantId: inst.tenantId,
      channel: 'webhook',
      title: `Webhook → ${decoded.entity} created`,
      body: `id=${createdId}`,
      sourceKind: decoded.entity,
      sourceId: createdId,
    });

    this.logger.log(
      `webhook ${instanceId} → tenant=${inst.tenantId} entity=${decoded.entity} id=${createdId}`
    );
    return { accepted: true, entity: decoded.entity, id: createdId };
  }

  private async findInstance(instanceId: string) {
    // Small indirection to keep the admin-repo interface focused — the repo
    // already owns admin-mode DB access.
    return this.instances.findByIdAdmin(instanceId);
  }
}
