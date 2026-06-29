export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  publicId: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface StorageProvider {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(publicId: string, version: number): Promise<void>;
  getThumbnailUrl(publicId: string, version: number): string;
  getOriginalUrl(publicId: string, version: number): string;
}
