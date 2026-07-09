import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AssetsService } from './assets.service';

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class AssetCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(AssetCleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly assets: AssetsService) {
    if (process.env.NODE_ENV !== 'test') {
      this.timer = setInterval(() => {
        this.run().catch((e) => this.logger.error(`Cleanup tick failed: ${e}`));
      }, CLEANUP_INTERVAL_MS);
    }
  }

  async run(): Promise<number> {
    return this.assets.retryDeletions();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
