const TAIWAN_COUNTRY_CODE = '+886';
const LOCAL_MOBILE_PATTERN = /^09\d{8}$/;
const COUNTRY_CODE_WITHOUT_PLUS_PATTERN = /^8869\d{8}$/;
const PHONE_SEPARATOR_PATTERN = /[\s\-()]/g;

/** 統一成 Firebase 使用的 E.164 格式：0912345678 → +886912345678 */
export function normalizeTaiwanPhone(phone: string): string {
  const compact = phone.replace(PHONE_SEPARATOR_PATTERN, '');
  if (LOCAL_MOBILE_PATTERN.test(compact)) return TAIWAN_COUNTRY_CODE + compact.slice(1);
  if (COUNTRY_CODE_WITHOUT_PLUS_PATTERN.test(compact)) return `+${compact}`;
  return compact;
}
