import { Module } from '@nestjs/common';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { AssetsModule } from '../assets/assets.module';
import { SemanticModule } from '../ai/context/semantic/semantic.module';

@Module({
  imports: [AssetsModule, SemanticModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
