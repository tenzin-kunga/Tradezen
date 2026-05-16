import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './trades/trades.module';
import { AuthModule } from './auth/auth.module';
import { JournalsModule } from './journals/journals.module';
import { TagsModule } from './tags/tags.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { ThrottlerEventsGuard } from './common/guards/throttler.guard';
import { SnapshotService } from './analytics/snapshot.service';
import { BehavioralService } from './analytics/behavioral.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              },
        customProps: (req: Request) => ({
          requestId: req.id,
        }),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers.set-cookie',
          ],
          censor: '**REDACTED**',
        },
      },
    }),
    AuthModule,
    TradesModule,
    JournalsModule,
    TagsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerEventsGuard },
    SnapshotService,
    BehavioralService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
