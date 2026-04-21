import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { RemindersQueueService } from './reminders-queue.service.js';

@Global()
@Module({
  providers: [RedisService, RemindersQueueService],
  exports: [RedisService, RemindersQueueService],
})
export class CoreJobsModule {}
