import { Request } from 'express';

const IPV4_MAPPED_PREFIX = '::ffff:';
/** users.ip / cases.ip 等欄位長度 */
export const MAX_IP_LENGTH = 45;

/**
 * 取得使用者真實 IP。
 * 依賴 `app.set('trust proxy', 'loopback')`：Express 只信任本機 nginx 附加的 X-Forwarded-For，
 * 使用者自己偽造的 header 不會被採用。
 */
export function getClientIp(request: Request): string {
  return normalizeIp(request.ip ?? request.socket?.remoteAddress ?? '');
}

export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  const withoutPrefix = trimmed.startsWith(IPV4_MAPPED_PREFIX) ? trimmed.slice(IPV4_MAPPED_PREFIX.length) : trimmed;
  return withoutPrefix.slice(0, MAX_IP_LENGTH);
}
