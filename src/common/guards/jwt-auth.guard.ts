import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ApiException } from '../api/api.exception';
import { ErrorCodes } from '../api/error-codes';
import { AuthenticatedRequest } from '../interfaces/request-user.interface';
import { TokenService } from '../../token/token.service';
import { extractBearerToken } from './bearer-token.util';

/** 必須登入 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new ApiException(ErrorCodes.UNAUTHORIZED, 'login required');

    const payload = this.tokenService.verify(token);
    if (!payload) throw new ApiException(ErrorCodes.UNAUTHORIZED, 'invalid or expired token');

    request.user = { uid: payload.uid };
    return true;
  }
}
