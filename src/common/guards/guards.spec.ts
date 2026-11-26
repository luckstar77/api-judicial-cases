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
    it('should attach the user when the token is valid', () => {
      mockTokenService.verify.mockReturnValue({ uid: 'uid-1', phone: '+886912345678' });
      const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good' } };

      expect(new JwtAuthGuard(tokenService).canActivate(contextFor(request))).toBe(true);
      expect(request.user).toEqual({ uid: 'uid-1' });
    });

    it('should reject missing or invalid tokens', () => {
      mockTokenService.verify.mockReturnValue(undefined);

      expect(() => new JwtAuthGuard(tokenService).canActivate(contextFor({ headers: {} }))).toThrow(ApiException);
      expect(() => new JwtAuthGuard(tokenService).canActivate(contextFor({ headers: { authorization: 'Bearer bad' } }))).toThrow(ApiException);
    });
  });

  describe('OptionalJwtAuthGuard', () => {
    it('should continue as guest when the token is invalid', () => {
      mockTokenService.verify.mockReturnValue(undefined);
      const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer bad' } };

      expect(new OptionalJwtAuthGuard(tokenService).canActivate(contextFor(request))).toBe(true);
      expect(request.user).toBeUndefined();
    });
  });
});
