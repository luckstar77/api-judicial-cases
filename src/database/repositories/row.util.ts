/** getRawMany 回傳的欄位轉換工具：null → undefined、數字字串 → number */
export type RawRow = Record<string, unknown>;

export function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value).trim();
}

export function requiredString(value: unknown): string {
  return optionalString(value) ?? '';
}

export function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

export function requiredNumber(value: unknown): number {
  return optionalNumber(value) ?? 0;
}

export function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

/** cases.imageUrls 是 JSON 欄位，舊資料可能是 JSON 字串 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || value.length === 0) return [];
  try {
    return toStringArray(JSON.parse(value));
  } catch {
    return [];
  }
}
