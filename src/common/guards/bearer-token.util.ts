import { Request } from 'express';

/** RFC 7235：auth scheme 不分大小寫 */
const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;
  const token = BEARER_PATTERN.exec(header)?.[1]?.trim();
  return token ? token : undefined;
}
