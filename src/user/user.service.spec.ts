import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { mockTokenService } from '../token/test/mock';
import { TokenService } from '../token/token.service';
import { UserNotFoundError, UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let databaseService: MockDatabaseService;
  const user = { uid: 'uid-1', phone: '+886912345678', ip: '1.2.3.4', name: '王小明', email: 'ming@example.com', displayName: '小明' };

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [UserService, { provide: DatabaseService, useValue: databaseService }, { provide: TokenService, useValue: mockTokenService }],
    }).compile();
    service = moduleRef.get(UserService);
  });

  describe('getUser', () => {
    it('should throw UserNotFoundError when the user does not exist', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(undefined);

      await expect(service.getUser('missing')).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should hash the new password and keep omitted fields undefined', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(user);

      await service.updateProfile('uid-1', { password: 'new-password' });

      const [uid, input] = databaseService.userRepository.updateProfile.mock.calls[0];
      expect(uid).toBe('uid-1');
      expect(input.displayName).toBeUndefined();
      expect(input.email).toBeUndefined();
      expect(input.passwordHash.startsWith('scrypt$')).toBe(true);
    });

    it('should not touch the password when it is not provided', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(user);

      await service.updateProfile('uid-1', { displayName: '新暱稱' });

      expect(databaseService.userRepository.updateProfile).toHaveBeenCalledWith('uid-1', { displayName: '新暱稱', email: undefined, passwordHash: undefined });
    });

    it('should not update anything when the user does not exist', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(undefined);

      await expect(service.updateProfile('missing', { displayName: 'x' })).rejects.toBeInstanceOf(UserNotFoundError);
      expect(databaseService.userRepository.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should sign a token compatible with the legacy payload', async () => {
      databaseService.userRepository.findByUid.mockResolvedValue(user);

      const session = await service.createSession('uid-1');

      expect(mockTokenService.sign).toHaveBeenCalledWith(user);
      expect(session).toEqual({ user, accessToken: 'signed-token' });
    });
  });

  describe('toProfile', () => {
    it('should drop the ip from the public profile', () => {
      expect(service.toProfile(user)).toEqual({ uid: 'uid-1', phone: '+886912345678', name: '王小明', email: 'ming@example.com', displayName: '小明' });
    });
  });
});
