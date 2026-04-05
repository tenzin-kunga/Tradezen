import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './trades/trades.module';

@Module({
  imports: [TradesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
