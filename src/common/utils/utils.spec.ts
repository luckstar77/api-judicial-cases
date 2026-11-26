import { isDistrictOfCity, isTaiwanCity, toCanonicalCity, toCanonicalDistrict, toJudgmentCity } from './city.util';
import { normalizeIp } from './ip.util';
import { maskHalf, maskIp } from './mask.util';
import { buildPaginated } from './pagination.util';
import { hashPassword, verifyPassword } from './password.util';
import { normalizeTaiwanPhone } from './phone.util';
import { createHash } from 'crypto';

describe('utils', () => {
  describe('maskHalf', () => {
    it('should mask the middle half of the value', () => {
      expect(maskHalf('王小明')).toBe('王*明');
      expect(maskHalf('0912345678')).toBe('09*****678');
      expect(maskHalf('A123456789')).toBe('A1*****789');
    });

    it('should return empty string when value is empty', () => {
      expect(maskHalf(null)).toBe('');
      expect(maskHalf(undefined)).toBe('');
      expect(maskHalf('')).toBe('');
    });

    it('should fully mask single character', () => {
      expect(maskHalf('王')).toBe('*');
    });
  });

  describe('maskIp', () => {
    it('should keep the first two IPv4 segments', () => {
      expect(maskIp('35.78.212.43')).toBe('35.78.*.*');
    });

    it('should keep the first two IPv6 groups', () => {
      expect(maskIp('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:*');
    });

    it('should return undefined when ip is empty', () => {
      expect(maskIp(null)).toBeUndefined();
      expect(maskIp('')).toBeUndefined();
    });
  });

  describe('normalizeIp', () => {
    it('should strip the IPv4-mapped IPv6 prefix', () => {
      expect(normalizeIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
    });

    it('should cap the length to fit the database column', () => {
      expect(normalizeIp('a'.repeat(100))).toHaveLength(45);
    });
  });

  describe('normalizeTaiwanPhone', () => {
    it('should convert local mobile number to E.164', () => {
      expect(normalizeTaiwanPhone('0912345678')).toBe('+886912345678');
      expect(normalizeTaiwanPhone('0912-345-678')).toBe('+886912345678');
      expect(normalizeTaiwanPhone('886912345678')).toBe('+886912345678');
    });

    it('should keep E.164 numbers unchanged', () => {
      expect(normalizeTaiwanPhone('+886912345678')).toBe('+886912345678');
    });
  });

  describe('city', () => {
    it('should normalize city names to judgment format', () => {
      expect(toJudgmentCity('台北市')).toBe('臺北');
      expect(toJudgmentCity('臺北市')).toBe('臺北');
      expect(toJudgmentCity('臺北')).toBe('臺北');
      expect(toJudgmentCity('新竹縣')).toBe('新竹');
    });

    it('should validate city and district pairs', () => {
      expect(isTaiwanCity('台北市')).toBe(true);
      expect(isTaiwanCity('火星市')).toBe(false);
      expect(isDistrictOfCity('台北市', '大安區')).toBe(true);
      expect(isDistrictOfCity('台北市', '板橋區')).toBe(false);
    });

    it('should treat 台 and 臺 as the same character', () => {
      expect(toCanonicalCity('臺北市')).toBe('台北市');
      expect(toCanonicalDistrict('雲林縣', '臺西鄉')).toBe('台西鄉');
      expect(toCanonicalDistrict('屏東縣', '霧台鄉')).toBe('霧臺鄉');
      expect(toCanonicalDistrict('台北市', '板橋區')).toBeUndefined();
      expect(toCanonicalCity('火星市')).toBeUndefined();
    });

    it('should not treat Object prototype keys as cities', () => {
      expect(isTaiwanCity('constructor')).toBe(false);
      expect(toCanonicalDistrict('constructor', 'x')).toBeUndefined();
    });
  });

  describe('buildPaginated', () => {
    it('should build pagination meta', () => {
      expect(buildPaginated([1, 2], 2, 2, 5).meta).toEqual({
        take: 2,
        page: 2,
        pageCount: 3,
        itemCount: 2,
        totalCount: 5,
        hasPreviousPage: true,
        hasNextPage: true,
      });
    });

    it('should report no pages when there is no data', () => {
      expect(buildPaginated([], 1, 10, 0).meta).toMatchObject({ pageCount: 0, hasNextPage: false, hasPreviousPage: false });
    });
  });

  describe('password', () => {
    it('should verify a scrypt hash', async () => {
      const hash = await hashPassword('correct horse');
      expect(hash.startsWith('scrypt$')).toBe(true);
      await expect(verifyPassword('correct horse', hash)).resolves.toEqual({ isValid: true, needsRehash: false });
      await expect(verifyPassword('wrong', hash)).resolves.toEqual({ isValid: false, needsRehash: false });
    });

    it('should accept legacy sha256 hashes and ask for rehash', async () => {
      const legacy = createHash('sha256').update('legacy-pass').digest('hex');
      await expect(verifyPassword('legacy-pass', legacy)).resolves.toEqual({ isValid: true, needsRehash: true });
      await expect(verifyPassword('wrong', legacy)).resolves.toEqual({ isValid: false, needsRehash: true });
    });

    it('should reject when no hash is stored', async () => {
      await expect(verifyPassword('anything', undefined)).resolves.toEqual({ isValid: false, needsRehash: false });
    });

    it('should use a random salt for each hash', async () => {
      expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
    });
  });
});
