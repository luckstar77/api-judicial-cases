import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const config = { get: jest.fn((key: string) => (key === 'S3_BUCKET_NAME' ? 'images-bucket' : 'ap-northeast-1')) } as unknown as ConfigService<
    EnvironmentVariables,
    true
  >;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should upload each image with an immutable cache header and return public urls', async () => {
    const send = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({}));
    const service = new StorageService(config);

    const urls = await service.uploadCaseImages([
      { buffer: Buffer.from('a'), mimetype: 'image/png' },
      { buffer: Buffer.from('b'), mimetype: 'image/jpeg' },
    ]);

    expect(send).toHaveBeenCalledTimes(2);
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({ Bucket: 'images-bucket', ContentType: 'image/png', CacheControl: 'public, max-age=31536000, immutable' });
    expect(command.input.Key).toMatch(/^cases\/\d+-[0-9a-f-]{36}\.png$/);
    expect(urls[0]).toBe(`https://images-bucket.s3.amazonaws.com/${command.input.Key}`);
    expect(urls[1]).toMatch(/\.jpg$/);
  });

  it('should delete only objects that belong to the bucket', async () => {
    const send = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => ({}));
    const service = new StorageService(config);

    await service.deleteByUrls(['https://images-bucket.s3.amazonaws.com/cases/a.png', 'https://evil.example.com/cases/b.png']);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0] as DeleteObjectsCommand;
    expect(command.input).toEqual({ Bucket: 'images-bucket', Delete: { Objects: [{ Key: 'cases/a.png' }] } });
  });

  it('should not call S3 when there is nothing to delete and swallow delete failures', async () => {
    const send = jest.spyOn(S3Client.prototype, 'send').mockImplementation(async () => {
      throw new Error('s3 down');
    });
    const service = new StorageService(config);

    await service.deleteByUrls([]);
    expect(send).not.toHaveBeenCalled();
    await expect(service.deleteByUrls(['https://images-bucket.s3.amazonaws.com/cases/a.png'])).resolves.toBeUndefined();
  });
});
