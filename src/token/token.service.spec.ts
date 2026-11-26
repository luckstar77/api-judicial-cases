import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { createMockDatabaseService, MockDatabaseService } from '../database/test/mock';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const jwtService = new JwtService({ secret: 'unit-test-secret' });
  let databaseService: MockDatabaseService;
  let service: TokenService;

  beforeEach(() => {
    databaseService = createMockDatabaseService();
    service = new TokenService(jwtService, databaseService as unknown as DatabaseService);
  });

  describe('sign', () => {
    it('should only put uid and token version into the payload', () => {
      const payload = jwtService.decode<Record<string, unknown>>(service.sign({ uid: 'uid-1', tv: 2 }));

      expect(payload).toMatchObject({ uid: 'uid-1', tv: 2 });
      expect(Object.keys(payload).sort()).toEqual(['iat', 'tv', 'uid']);
    });
  });

  describe('authenticate', () => {
    it('should accept a token whose version matches the database', async () => {
      databaseService.userRepository.findTokenVersion.mockResolvedValue(2);

      await expect(service.authenticate(service.sign({ uid: 'uid-1', tv: 2 }))).resolves.toEqual({ uid: 'uid-1' });
    });

    it('should treat legacy tokens without a version as version 0', async () => {
      databaseService.userRepository.findTokenVersion.mockResolvedValue(0);
      const legacyToken = jwtService.sign({ uid: 'uid-1', phone: '+886912345678', name: '王小明' });

      await expect(service.authenticate(legacyToken)).resolves.toEqual({ uid: 'uid-1' });
    });

    it('should reject a token issued before the last password change', async () => {
      databaseService.userRepository.findTokenVersion.mockResolvedValue(1);

      await expect(service.authenticate(service.sign({ uid: 'uid-1', tv: 0 }))).resolves.toBeUndefined();
    });

    it('should reject tokens of deleted accounts, forged signatures and missing uid', async () => {
      databaseService.userRepository.findTokenVersion.mockResolvedValue(undefined);
      await expect(service.authenticate(service.sign({ uid: 'gone' }))).resolves.toBeUndefined();

      const forged = new JwtService({ secret: 'other-secret' }).sign({ uid: 'uid-1', tv: 0 });
      await expect(service.authenticate(forged)).resolves.toBeUndefined();
      await expect(service.authenticate(jwtService.sign({ tv: 0 }))).resolves.toBeUndefined();
      expect(databaseService.userRepository.findTokenVersion).not.toHaveBeenCalledWith(undefined);
    });
  });
});
