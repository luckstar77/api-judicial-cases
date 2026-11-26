import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
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
/** 案例圖片檔名含隨機 UUID，內容不會變動，可以長期快取 */
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** 上傳案例圖片到 S3（bucket 為 BucketOwnerEnforced，公開讀取由 bucket policy 控制） */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.client = new S3Client({ region: config.get('AWS_REGION', { infer: true }) });
    this.bucket = config.get('S3_BUCKET_NAME', { infer: true });
  }

  async uploadCaseImages(files: UploadableFile[]): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadCaseImage(file)));
  }

  private async uploadCaseImage(file: UploadableFile): Promise<string> {
    const extension = ALLOWED_IMAGE_TYPES[file.mimetype] ?? 'bin';
    const key = `${CASE_IMAGE_PREFIX}/${Date.now()}-${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype, CacheControl: IMMUTABLE_CACHE_CONTROL }),
    );
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
