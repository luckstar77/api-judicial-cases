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
  /** 2019 年 3 月後開放的區域（例如 ap-east-2 台北）不支援舊式全球網址，所以新網址一律帶區域 */
  private readonly publicUrlPrefix: string;
  /** 舊資料可能存著舊式全球網址，刪除時仍要認得 */
  private readonly legacyUrlPrefix: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const region = config.get('AWS_REGION', { infer: true });
    this.client = new S3Client({
      region,
      requestHandler: { connectionTimeout: S3_CONNECTION_TIMEOUT_MS, requestTimeout: S3_REQUEST_TIMEOUT_MS },
    });
    this.bucket = config.get('S3_BUCKET_NAME', { infer: true });
    this.publicUrlPrefix = `https://${this.bucket}.s3.${region}.amazonaws.com/`;
    this.legacyUrlPrefix = `https://${this.bucket}.s3.amazonaws.com/`;
  }

  /** 呼叫端須先以 detectImageType 確認 mimetype 與檔案內容相符；任一張失敗時刪掉已上傳的其他張再拋出錯誤 */
  async uploadCaseImages(files: UploadableFile[]): Promise<string[]> {
    const results = await Promise.allSettled(files.map((file) => this.uploadCaseImage(file)));
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (!failure) return results.map((result) => (result as PromiseFulfilledResult<string>).value);

    const uploaded = results.filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled').map((result) => result.value);
    await this.deleteByUrls(uploaded);
    throw failure.reason;
  }

  /** 後續步驟失敗時清掉已上傳的圖片；清除失敗只記錄，不影響原本的錯誤 */
  async deleteByUrls(urls: string[]): Promise<void> {
    const keys = urls.map((url) => this.keyOf(url)).filter((key): key is string => key !== undefined);
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
    return `${this.publicUrlPrefix}${key}`;
  }

  private keyOf(url: string): string | undefined {
    const prefix = [this.publicUrlPrefix, this.legacyUrlPrefix].find((candidate) => url.startsWith(candidate));
    return prefix === undefined ? undefined : url.slice(prefix.length);
  }
}
