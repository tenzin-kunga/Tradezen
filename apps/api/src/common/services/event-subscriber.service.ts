import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { TradesGateway } from '../../gateway/trades.gateway';

@Injectable()
export class EventSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EventSubscriber');
  private subClient: Redis;

  constructor(private readonly gateway: TradesGateway) {}

  async onModuleInit() {
    this.subClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
    });

    this.subClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleEvent(channel, data);
      } catch (error) {
        this.logger.error(
          `Failed to parse message from ${channel}: ${(error as Error).message}`,
        );
      }
    });

    await this.subClient.psubscribe('trades:*', 'jobs:*', 'analytics:*');
    this.logger.log('Redis subscriber connected, channels subscribed');
  }

  async onModuleDestroy() {
    await this.subClient.quit();
  }

  private handleEvent(channel: string, data: unknown) {
    if (channel.startsWith('trades:')) {
      const userId = channel.split(':')[1];
      const [event, payload] = data as [string, unknown];
      this.gateway.emitToUser(userId, event, payload);
    } else if (channel.startsWith('jobs:')) {
      const userId = channel.split(':')[1];
      const [event, payload] = data as [string, unknown];
      this.gateway.emitToUser(userId, event, payload);
    } else if (channel.startsWith('analytics:')) {
      const userId = channel.split(':')[1];
      const [event, payload] = data as [string, unknown];
      this.gateway.emitToUser(userId, event, payload);
    }
  }
}
