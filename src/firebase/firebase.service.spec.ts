import { ConfigService } from '@nestjs/config';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { EnvironmentVariables } from '../config/env.validation';
import { FirebaseService, InvalidFirebaseTokenError } from './firebase.service';

jest.mock('firebase-admin/app', () => ({ getApps: jest.fn(() => []), initializeApp: jest.fn(() => ({ name: 'test-app' })) }));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

describe('FirebaseService', () => {
  const verifyIdToken = jest.fn();
  const config = { get: jest.fn(() => 'rental-project') } as unknown as ConfigService<EnvironmentVariables, true>;
  let service: FirebaseService;

  beforeEach(() => {
    jest.mocked(getAuth).mockReturnValue({ verifyIdToken } as unknown as ReturnType<typeof getAuth>);
    service = new FirebaseService(config);
    service.onModuleInit();
  });

  it('should initialize firebase with the project id only once', () => {
    expect(initializeApp).toHaveBeenCalledWith({ projectId: 'rental-project' });

    jest.mocked(getApps).mockReturnValueOnce([{ name: 'existing' } as ReturnType<typeof getApps>[number]]);
    new FirebaseService(config).onModuleInit();

    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('should return uid and phone of a verified token', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: '+886912345678' });

    await expect(service.verifyPhoneToken('id-token')).resolves.toEqual({ uid: 'uid-1', phone: '+886912345678' });
  });

  it('should reject tokens without a phone number', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'uid-1' });

    await expect(service.verifyPhoneToken('id-token')).rejects.toThrow('token has no phone number');
  });

  it('should wrap firebase errors in InvalidFirebaseTokenError', async () => {
    verifyIdToken.mockRejectedValue(new Error('auth/id-token-expired'));

    await expect(service.verifyPhoneToken('expired')).rejects.toBeInstanceOf(InvalidFirebaseTokenError);
  });
});
