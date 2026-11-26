import { ExecutionContext } from '@nestjs/common';
import { ApiException } from '../api/api.exception';
import { AuthenticatedRequest } from '../interfaces/request-user.interface';
import { TokenService } from '../../token/token.service';
import { mockTokenService } from '../../token/test/mock';
import { extractBearerToken } from './bearer-token.util';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('auth guards', () => {
  const tokenService = mockTokenService as unknown as TokenService;

  describe('extractBearerToken', () => {
    it('should read the bearer token case-insensitively', () => {
      expect(extractBearerToken({ headers: { authorization: 'bearer abc.def' } } as AuthenticatedRequest)).toBe('abc.def');
      expect(extractBearerToken({ headers: { authorization: 'Basic abc' } } as AuthenticatedRequest)).toBeUndefined();
      expect(extractBearerToken({ headers: {} } as AuthenticatedRequest)).toBeUndefined();
    });
  });

  describe('JwtAuthGuard', () => {
    it('should attach the user when the token is valid', async () => {
      mockTokenService.authenticate.mockResolvedValue({ uid: 'uid-1' });
      const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good' } };

      await expect(new JwtAuthGuard(tokenService).canActivate(contextFor(request))).resolves.toBe(true);
      expect(request.user).toEqual({ uid: 'uid-1' });
    });

    it('should reject missing, invalid or revoked tokens', async () => {
      mockTokenService.authenticate.mockResolvedValue(undefined);

      await expect(new JwtAuthGuard(tokenService).canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(ApiException);
      await expect(new JwtAuthGuard(tokenService).canActivate(contextFor({ headers: { authorization: 'Bearer bad' } }))).rejects.toBeInstanceOf(ApiException);
    });
  });

  describe('OptionalJwtAuthGuard', () => {
    it('should continue as guest when the token is invalid', async () => {
      mockTokenService.authenticate.mockResolvedValue(undefined);
      const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer bad' } };

      await expect(new OptionalJwtAuthGuard(tokenService).canActivate(contextFor(request))).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });
  });
});
