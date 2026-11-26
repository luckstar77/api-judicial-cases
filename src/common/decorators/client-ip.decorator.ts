import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { getClientIp } from '../utils/ip.util';

export const ClientIp = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  return getClientIp(context.switchToHttp().getRequest<Request>());
});
