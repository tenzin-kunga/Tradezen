import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, UploadFile, UploadResult } from './storage.provider';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(file: UploadFile): Promise<UploadResult> {
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || 'tradezen',
          resource_type: resourceType,
        },
        (error, result) => {
          if (error)
            return reject(
              new Error(
                error instanceof Error
                  ? error.message
                  : 'cloudinary upload failed',
              ),
            );
          resolve({
            providerKey: result!.public_id,
            version: result!.version,
            width: result!.width,
            height: result!.height,
            format: result!.format,
            bytes: result!.bytes,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(providerKey: string): Promise<void> {
    await cloudinary.uploader.destroy(providerKey, { invalidate: true });
  }

  getThumbnailUrl(
    providerKey: string,
    version: number,
    mimetype?: string,
  ): string {
    if (mimetype && !mimetype.startsWith('image/')) {
      return this.getOriginalUrl(providerKey, version, mimetype);
    }
    return cloudinary.url(providerKey, {
      version,
      transformation: [
        {
          width: parseInt(process.env.THUMBNAIL_WIDTH || '300'),
          height: parseInt(process.env.THUMBNAIL_HEIGHT || '200'),
          crop: 'fill',
        },
      ],
    });
  }

  getOriginalUrl(
    providerKey: string,
    version: number,
    mimetype?: string,
  ): string {
    if (mimetype && !mimetype.startsWith('image/')) {
      // Raw files (pdf, xlsx, docx, ...): no transformations.
      return cloudinary.url(providerKey, { version });
    }
    return cloudinary.url(providerKey, {
      version,
      transformation: [
        {
          width: parseInt(process.env.FULL_WIDTH || '1200'),
          height: parseInt(process.env.FULL_HEIGHT || '800'),
          crop: 'limit',
        },
      ],
    });
  }
}
