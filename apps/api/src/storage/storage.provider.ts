export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface UploadResult {
  providerKey: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface StorageProvider {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(providerKey: string): Promise<void>;
  getThumbnailUrl(
    providerKey: string,
    version: number,
    mimetype?: string,
  ): string;
  getOriginalUrl(
    providerKey: string,
    version: number,
    mimetype?: string,
  ): string;
}
