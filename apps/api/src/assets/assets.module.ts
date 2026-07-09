import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetCleanupService } from './asset-cleanup.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [AssetsService, AssetCleanupService],
  exports: [AssetsService],
})
export class AssetsModule {}
