import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './trades/trades.module';
import { AuthModule } from './auth/auth.module';
import { JournalsModule } from './journals/journals.module';
import { TagsModule } from './tags/tags.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [AuthModule, TradesModule, JournalsModule, TagsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
