import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatThreadService } from './chat-thread.service';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatThreadService],
  exports: [ChatService, ChatThreadService],
})
export class ChatModule {}
