import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, RequestUser } from '../interfaces/request-user.interface';

/** 取得登入者；搭配 JwtAuthGuard 一定有值，搭配 OptionalJwtAuthGuard 可能是 undefined */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): RequestUser | undefined => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
