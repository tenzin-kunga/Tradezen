import { Controller, Post, Delete, HttpCode } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  async seed(@CurrentUser('id') userId: string) {
    await this.seedService.seedData(userId);
    return { message: 'Sample data loaded successfully' };
  }

  @Delete()
  @HttpCode(200)
  async deleteAll(@CurrentUser('id') userId: string) {
    await this.seedService.deleteAllUserData(userId);
    return { message: 'All data deleted successfully' };
  }

  @Delete('sample')
  @HttpCode(200)
  async deleteSample(@CurrentUser('id') userId: string) {
    await this.seedService.deleteSampleData(userId);
    return { message: 'Sample data deleted successfully' };
  }
}
