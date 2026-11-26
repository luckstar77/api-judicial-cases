import { optionalNumber, optionalString, requiredNumber, requiredString, toDate, toStringArray } from './row.util';

describe('row.util', () => {
  describe('strings', () => {
    it('should trim values and turn null or undefined into undefined', () => {
      expect(optionalString('  王小明 ')).toBe('王小明');
      expect(optionalString(42)).toBe('42');
      expect(optionalString(null)).toBeUndefined();
      expect(optionalString(undefined)).toBeUndefined();
    });

    it('should fall back to an empty string when a required value is missing', () => {
      expect(requiredString(null)).toBe('');
      expect(requiredString(' x ')).toBe('x');
    });
  });

  describe('numbers', () => {
    it('should convert numeric strings and keep missing values undefined', () => {
      expect(optionalNumber('18000')).toBe(18000);
      expect(optionalNumber(null)).toBeUndefined();
      expect(optionalNumber(undefined)).toBeUndefined();
    });

    it('should fall back to 0 when a required number is missing', () => {
      expect(requiredNumber(null)).toBe(0);
      expect(requiredNumber('7')).toBe(7);
    });
  });

  describe('toDate', () => {
    it('should keep Date instances and parse strings', () => {
      const date = new Date('2026-11-26T00:00:00Z');
      expect(toDate(date)).toBe(date);
      expect(toDate('2026-11-26T00:00:00Z').toISOString()).toBe('2026-11-26T00:00:00.000Z');
    });
  });

  describe('toStringArray', () => {
    it('should accept arrays and JSON strings, dropping non-string items', () => {
      expect(toStringArray(['a', 1, 'b'])).toEqual(['a', 'b']);
      expect(toStringArray('["https://x/1.jpg"]')).toEqual(['https://x/1.jpg']);
    });

    it('should return an empty array for empty, invalid or non-string input', () => {
      expect(toStringArray('')).toEqual([]);
      expect(toStringArray('not json')).toEqual([]);
      expect(toStringArray(null)).toEqual([]);
      expect(toStringArray({ url: 'x' })).toEqual([]);
    });
  });
});
