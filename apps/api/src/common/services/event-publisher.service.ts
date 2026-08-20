import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisConnection } from '../utils/redis-connection';

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventPublisher');
  private pubClient: Redis;

  onModuleInit() {
    this.pubClient = new Redis(getRedisConnection());
    this.pubClient.on('error', (err) => {
      this.logger.error(`Redis pub error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.pubClient.quit();
  }

  async publish(channel: string, data: unknown) {
    try {
      await this.pubClient.publish(channel, JSON.stringify(data));
    } catch (error) {
      this.logger.error(
        `Failed to publish to ${channel}: ${(error as Error).message}`,
      );
    }
  }
}
