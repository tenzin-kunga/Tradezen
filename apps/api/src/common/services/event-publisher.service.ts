import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventPublisher');
  private pubClient: Redis;

  async onModuleInit() {
    this.pubClient = new Redis(process.env.REDIS_URL!);
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
