import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCaseBody, ListCasesQuery } from './case.dto';

const VALID_BODY = { title: '欠租', content: '內容', rent: '1000', defendantName: '某人' };

describe('case DTOs', () => {
  describe('ListCasesQuery', () => {
    it('should canonicalize 臺 to the list spelling for city and district', () => {
      const query = plainToInstance(ListCasesQuery, { city: ' 臺北市 ', district: '臺西鄉' });
      expect(query.city).toBe('台北市');

      const yunlin = plainToInstance(ListCasesQuery, { city: '雲林縣', district: '臺西鄉' });
      expect(yunlin.district).toBe('台西鄉');
    });

    it('should keep unknown values as typed and drop blank ones', () => {
      expect(plainToInstance(ListCasesQuery, { city: '火星市', district: '某區' })).toMatchObject({ city: '火星市', district: '某區' });
      expect(plainToInstance(ListCasesQuery, { city: '  ', district: '' })).toMatchObject({ city: undefined, district: undefined });
      expect(plainToInstance(ListCasesQuery, { district: '大安區' }).district).toBe('大安區');
    });
  });

  describe('CreateCaseBody', () => {
    it('should accept 臺 spellings and store canonical names', async () => {
      const body = plainToInstance(CreateCaseBody, { ...VALID_BODY, location: '屏東縣', district: '霧台鄉' });

      await expect(validate(body)).resolves.toHaveLength(0);
      expect(body).toMatchObject({ location: '屏東縣', district: '霧臺鄉' });
    });

    it('should reject a district outside the city and an unknown city', async () => {
      const wrongDistrict = await validate(plainToInstance(CreateCaseBody, { ...VALID_BODY, location: '台北市', district: '板橋區' }));
      const unknownCity = await validate(plainToInstance(CreateCaseBody, { ...VALID_BODY, location: '火星市', district: '大安區' }));

      expect(wrongDistrict.map((error) => error.property)).toContain('district');
      expect(unknownCity.map((error) => error.property)).toEqual(expect.arrayContaining(['location', 'district']));
    });
  });
});
