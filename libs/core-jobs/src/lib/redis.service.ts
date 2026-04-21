import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

// Shared ioredis connection for BullMQ producers/consumers. BullMQ itself
// requires `maxRetriesPerRequest: null` on connections used by Workers.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client: Redis | null = null;

  get connection(): Redis {
    if (this._client) return this._client;
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this._client = new Redis(url, { maxRetriesPerRequest: null });
    this.logger.log(`Connected to Redis at ${url}`);
    return this._client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this._client) {
      await this._client.quit();
      this._client = null;
    }
  }
}
