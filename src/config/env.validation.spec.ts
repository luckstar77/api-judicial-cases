import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const required = { JWT_SECRET: 'secret', FIREBASE_PROJECT_ID: 'project', S3_BUCKET_NAME: 'bucket' };

  it('should apply defaults', () => {
    expect(validateEnv(required)).toMatchObject({ PORT: 3010, HOST: '127.0.0.1', JWT_EXPIRES_IN: '30d', THROTTLE_LIMIT: 300, AUTH_THROTTLE_LIMIT: 10 });
  });

  it('should throw when JWT_SECRET is missing or empty', () => {
    expect(() => validateEnv({ ...required, JWT_SECRET: undefined })).toThrow(/Invalid environment variables/);
    expect(() => validateEnv({ ...required, JWT_SECRET: '' })).toThrow(/Invalid environment variables/);
  });

  it('should allow an empty DB_PASSWORD', () => {
    expect(validateEnv({ ...required, DB_PASSWORD: '' }).DB_PASSWORD).toBe('');
  });

  it('should reject an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(/Invalid environment variables/);
  });
});
