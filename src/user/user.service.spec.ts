import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { hashPassword } from '../common/utils/password.util';
import { mockTokenService } from '../token/test/mock';
import { TokenService } from '../token/token.service';
import { CurrentPasswordMismatchError, UserNotFoundError, UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let databaseService: MockDatabaseService;
  const user = {
    uid: 'uid-1',
    phone: '+886912345678',
    ip: '1.2.3.4',
    name: '王小明',
    email: 'ming@example.com',
    displayName: '小明',
    hasPassword: true,
    tokenVersion: 3,
  };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword('old-password');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [UserService, { provide: DatabaseService, useValue: databaseService }, { provide: TokenService, useValue: mockTokenService }],
    }).compile();
    service = moduleRef.get(UserService);
    databaseService.userRepository.findByUid.mockResolvedValue(user);
    databaseService.userRepository.findCredentialByUid.mockResolvedValue({ ...user, passwordHash });
  });

  describe('getUser', () => {
    it('should throw UserNotFoundError when the user does not exist', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(undefined);

      await expect(service.getUser('missing')).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should hash the new password when the current password matches', async () => {
      await service.updateProfile('uid-1', { password: 'new-password', currentPassword: 'old-password' });

      const [uid, input] = databaseService.userRepository.updateProfile.mock.calls[0];
      expect(uid).toBe('uid-1');
      expect(input.displayName).toBeUndefined();
      expect(input.email).toBeUndefined();
      expect(input.passwordHash.startsWith('scrypt$')).toBe(true);
    });

    it('should throw CurrentPasswordMismatchError when the current password is missing or wrong', async () => {
      await expect(service.updateProfile('uid-1', { password: 'new-password' })).rejects.toBeInstanceOf(CurrentPasswordMismatchError);
      await expect(service.updateProfile('uid-1', { password: 'new-password', currentPassword: 'nope' })).rejects.toBeInstanceOf(CurrentPasswordMismatchError);
      expect(databaseService.userRepository.updateProfile).not.toHaveBeenCalled();
    });

    it('should allow setting a first password when the account has none', async () => {
      databaseService.userRepository.findCredentialByUid.mockResolvedValue({ ...user, hasPassword: false, passwordHash: undefined });

      await service.updateProfile('uid-1', { password: 'first-password' });

      expect(databaseService.userRepository.updateProfile).toHaveBeenCalledTimes(1);
    });

    it('should not touch the password when it is not provided', async () => {
      await service.updateProfile('uid-1', { displayName: '新暱稱' });

      expect(databaseService.userRepository.updateProfile).toHaveBeenCalledWith('uid-1', { displayName: '新暱稱', email: undefined, passwordHash: undefined });
    });

    it('should not update anything when the user does not exist', async () => {
      databaseService.userRepository.findCredentialByUid.mockResolvedValue(undefined);

      await expect(service.updateProfile('missing', { displayName: 'x' })).rejects.toBeInstanceOf(UserNotFoundError);
      expect(databaseService.userRepository.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should sign only the uid and the current token version', async () => {
      const session = await service.createSession('uid-1');

      expect(mockTokenService.sign).toHaveBeenCalledWith({ uid: 'uid-1', tv: 3 });
      expect(session).toEqual({ user, accessToken: 'signed-token' });
    });
  });

  describe('toProfile', () => {
    it('should drop the ip and token version from the public profile', () => {
      expect(service.toProfile(user)).toEqual({
        uid: 'uid-1',
        phone: '+886912345678',
        name: '王小明',
        email: 'ming@example.com',
        displayName: '小明',
        hasPassword: true,
      });
    });
  });
});
