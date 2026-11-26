import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EnvironmentVariables } from '../config/env.validation';

export interface UploadableFile {
  buffer: Buffer;
  mimetype: string;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const CASE_IMAGE_PREFIX = 'cases';
const S3_CONNECTION_TIMEOUT_MS = 5_000;
const S3_REQUEST_TIMEOUT_MS = 20_000;
/** 案例圖片檔名含隨機 UUID，內容不會變動，可以長期快取 */
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** 上傳案例圖片到 S3（bucket 為 BucketOwnerEnforced，公開讀取由 bucket policy 控制） */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.client = new S3Client({
      region: config.get('AWS_REGION', { infer: true }),
      requestHandler: { connectionTimeout: S3_CONNECTION_TIMEOUT_MS, requestTimeout: S3_REQUEST_TIMEOUT_MS },
    });
    this.bucket = config.get('S3_BUCKET_NAME', { infer: true });
  }

  /** 呼叫端須先以 detectImageType 確認 mimetype 與檔案內容相符 */
  async uploadCaseImages(files: UploadableFile[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadCaseImage(file)));
  }

  /** 後續步驟失敗時清掉已上傳的圖片；清除失敗只記錄，不影響原本的錯誤 */
  async deleteByUrls(urls: string[]): Promise<void> {
    const prefix = `https://${this.bucket}.s3.amazonaws.com/`;
    const keys = urls.filter((url) => url.startsWith(prefix)).map((url) => url.slice(prefix.length));
    if (keys.length === 0) return;
    try {
      await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
    } catch (error) {
      this.logger.error(`Failed to delete orphan images: ${keys.join(', ')}`, error instanceof Error ? error.stack : String(error));
    }
  }

  private async uploadCaseImage(file: UploadableFile): Promise<string> {
    const extension = Object.hasOwn(ALLOWED_IMAGE_TYPES, file.mimetype) ? ALLOWED_IMAGE_TYPES[file.mimetype] : 'bin';
    const key = `${CASE_IMAGE_PREFIX}/${Date.now()}-${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, CacheControl: IMMUTABLE_CACHE_CONTROL }),
    );
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
