import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/request-user.interface';
import { TokenService } from '../../token/token.service';
import { extractBearerToken } from './bearer-token.util';

/** 選擇性登入：有合法 token 就帶上使用者，否則以訪客身分繼續 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    const session = token ? await this.tokenService.authenticate(token) : undefined;
    if (session) request.user = { uid: session.uid };
    return true;
  }
}
