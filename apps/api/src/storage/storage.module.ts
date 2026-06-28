import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  providers: [{ provide: 'StorageProvider', useClass: CloudinaryProvider }],
  exports: ['StorageProvider'],
})
export class StorageModule {}
