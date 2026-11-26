import { Test } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { FirebaseService, InvalidFirebaseTokenError } from '../firebase/firebase.service';
import { mockFirebaseService } from '../firebase/test/mock';
import { hashPassword } from '../common/utils/password.util';
import { mockUserService } from '../user/test/mock';
import { UserService } from '../user/user.service';
import { AuthService, InvalidCredentialsError, PhoneAlreadyRegisteredError } from './auth.service';
import { createHash } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let databaseService: MockDatabaseService;
  const session = { user: { uid: 'uid-1', phone: '+886912345678' }, accessToken: 'token' };
  const profile = { password: 'p@ssw0rd!', name: '王小明', displayName: '小明', email: 'ming@example.com' };

  beforeEach(async () => {
    databaseService = createMockDatabaseService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    mockUserService.createSession.mockResolvedValue(session);
  });

  describe('verifyPhone', () => {
    it('should upsert the phone user and issue a session', async () => {
      const result = await service.verifyPhone('valid:uid-1:+886912345678', '1.2.3.4');

      expect(databaseService.userRepository.upsertPhoneUser).toHaveBeenCalledWith({ uid: 'uid-1', phone: '+886912345678', ip: '1.2.3.4' });
      expect(mockUserService.createSession).toHaveBeenCalledWith('uid-1');
      expect(result).toBe(session);
    });

    it('should propagate invalid firebase token errors without touching the database', async () => {
      await expect(service.verifyPhone('forged', '1.2.3.4')).rejects.toBeInstanceOf(InvalidFirebaseTokenError);
      expect(databaseService.userRepository.upsertPhoneUser).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should store a scrypt hash instead of the plain password', async () => {
      databaseService.userRepository.hasPasswordForPhone.mockResolvedValue(false);

      await service.register({ firebaseToken: 'valid:uid-1:+886912345678', ...profile }, '1.2.3.4');

      const input = databaseService.userRepository.register.mock.calls[0][0];
      expect(input).toMatchObject({ uid: 'uid-1', phone: '+886912345678', name: '王小明', displayName: '小明', email: 'ming@example.com' });
      expect(input.passwordHash.startsWith('scrypt$')).toBe(true);
      expect(input.passwordHash).not.toContain(profile.password);
    });

    it('should throw PhoneAlreadyRegisteredError when the phone already has a password', async () => {
      databaseService.userRepository.hasPasswordForPhone.mockResolvedValue(true);

      await expect(service.register({ firebaseToken: 'valid:uid-1:+886912345678', ...profile }, '1.2.3.4')).rejects.toBeInstanceOf(PhoneAlreadyRegisteredError);
      expect(databaseService.userRepository.register).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should normalize local phone format before lookup', async () => {
      databaseService.userRepository.findCredentialByPhone.mockResolvedValue({
        uid: 'uid-1',
        phone: '+886912345678',
        passwordHash: await hashPassword('secret-pass'),
      });

      await service.login('0912-345-678', 'secret-pass');

      expect(databaseService.userRepository.findCredentialByPhone).toHaveBeenCalledWith('+886912345678');
      expect(databaseService.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('should rehash legacy sha256 passwords after a successful login', async () => {
      const legacy = createHash('sha256').update('old-pass').digest('hex');
      databaseService.userRepository.findCredentialByPhone.mockResolvedValue({ uid: 'uid-1', phone: '+886912345678', passwordHash: legacy });

      await service.login('+886912345678', 'old-pass');

      const [uid, newHash] = databaseService.userRepository.updatePasswordHash.mock.calls[0];
      expect(uid).toBe('uid-1');
      expect(newHash.startsWith('scrypt$')).toBe(true);
    });

    it('should throw InvalidCredentialsError when the password does not match', async () => {
      databaseService.userRepository.findCredentialByPhone.mockResolvedValue({
        uid: 'uid-1',
        phone: '+886912345678',
        passwordHash: await hashPassword('secret-pass'),
      });

      await expect(service.login('+886912345678', 'wrong')).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(mockUserService.createSession).not.toHaveBeenCalled();
    });

    it('should throw InvalidCredentialsError when the phone is unknown', async () => {
      databaseService.userRepository.findCredentialByPhone.mockResolvedValue(undefined);

      await expect(service.login('0900000000', 'whatever')).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });

  describe('toResult', () => {
    it('should map the session through UserService.toProfile', () => {
      mockUserService.toProfile.mockReturnValue({ uid: 'uid-1', phone: '+886912345678' });

      expect(service.toResult({ user: { uid: 'uid-1', phone: '+886912345678', ip: '1.2.3.4' }, accessToken: 'token' })).toEqual({
        user: { uid: 'uid-1', phone: '+886912345678' },
        accessToken: 'token',
      });
    });
  });
});
