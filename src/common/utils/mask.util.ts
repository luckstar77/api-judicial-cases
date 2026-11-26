const MASK_CHAR = '*';
const IPV4_VISIBLE_SEGMENTS = 2;
const IPV6_VISIBLE_GROUPS = 2;

/** 遮罩字串中間一半（王小明 → 王*明、0912345678 → 09*****678） */
export function maskHalf(value?: string | null): string {
  if (!value) return '';
  const length = value.length;
  if (length <= 1) return MASK_CHAR;
  const hideLength = Math.floor(length / 2);
  const start = Math.floor((length - hideLength) / 2);
  return value.slice(0, start) + MASK_CHAR.repeat(hideLength) + value.slice(start + hideLength);
}

/** 公開顯示用 IP：IPv4 只留前兩段，IPv6 只留前兩組 */
export function maskIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  if (ip.includes('.') && !ip.includes(':')) {
    const segments = ip.split('.');
    return [...segments.slice(0, IPV4_VISIBLE_SEGMENTS), MASK_CHAR, MASK_CHAR].join('.');
  }
  const groups = ip.split(':').filter((group) => group.length > 0);
  return `${groups.slice(0, IPV6_VISIBLE_GROUPS).join(':')}:${MASK_CHAR}`;
}
