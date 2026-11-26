import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Case } from '../database/entities';
import { createCase, createCaseComment, createCaseLike, createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { mockStorageService } from '../storage/test/mock';
import { bearer, createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';

const PNG_BYTES = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe('CaseController E2E', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let tokenService: TokenService;

  beforeAll(async () => {
    ({ app, dataSource, tokenService } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAllDataInDB(dataSource);
  });

  describe('GET /v1/cases', () => {
    it('should list cases newest first with masked defendant info and no poster PII', async () => {
      const author = await createUser(dataSource, { displayName: '受害房東', email: 'secret@example.com' });
      const older = await createCase(dataSource, { plaintiffId: author.uid, createdAt: new Date('2025-01-01T00:00:00Z') });
      const newer = await createCase(dataSource, {
        plaintiffId: author.uid,
        createdAt: new Date('2025-02-01T00:00:00Z'),
        defendantName: '王小明',
        defendantPhone: '0912345678',
        defendantIdNo: 'A123456789',
        imageUrls: ['https://images-rental.s3.amazonaws.com/cases/a.jpg'],
        ip: '35.78.212.43',
      });
      const fan = await createUser(dataSource);
      await createCaseLike(dataSource, { caseId: newer.id, userId: fan.uid });
      await createCaseComment(dataSource, { caseId: newer.id, userId: fan.uid });

      const res = await request(app.getHttpServer()).get('/v1/cases').expect(200);

      expect(res.body.data.list.map((item: { id: number }) => item.id)).toEqual([newer.id, older.id]);
      expect(res.body.data.list[0]).toMatchObject({
        id: newer.id,
        defendantName: '王*明',
        defendantPhone: '09*****678',
        defendantIdNo: 'A1*****789',
        imageUrls: ['https://images-rental.s3.amazonaws.com/cases/a.jpg'],
        authorDisplayName: '受害房東',
        likeCount: 1,
        commentCount: 1,
      });
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('secret@example.com');
      expect(serialized).not.toContain('35.78.212.43');
      expect(serialized).not.toContain(author.uid);
      expect(res.body.data.meta).toMatchObject({ totalCount: 2, page: 1 });
    });

    it('should use id as tiebreaker when createdAt is equal', async () => {
      const createdAt = new Date('2025-03-01T00:00:00Z');
      const first = await createCase(dataSource, { createdAt });
      const second = await createCase(dataSource, { createdAt });

      const res = await request(app.getHttpServer()).get('/v1/cases').expect(200);

      expect(res.body.data.list.map((item: { id: number }) => item.id)).toEqual([second.id, first.id]);
    });

    it('should filter by city and district', async () => {
      const taipei = await createCase(dataSource, { location: '台北市', district: '大安區' });
      await createCase(dataSource, { location: '台北市', district: '信義區' });
      await createCase(dataSource, { location: '高雄市', district: '苓雅區' });

      const res = await request(app.getHttpServer()).get('/v1/cases').query({ city: '台北市', district: '大安區' }).expect(200);

      expect(res.body.data.list.map((item: { id: number }) => item.id)).toEqual([taipei.id]);
    });
  });

  describe('GET /v1/cases/search', () => {
    it('should require login', async () => {
      await request(app.getHttpServer()).get('/v1/cases/search').query({ keyword: '王小明' }).expect(401);
    });

    it('should match defendant name, phone or id number exactly', async () => {
      const user = await createUser(dataSource);
      const byName = await createCase(dataSource, { defendantName: '林惡客', defendantPhone: '0900000001', defendantIdNo: 'B100000001' });
      const byPhone = await createCase(dataSource, { defendantName: '其他人', defendantPhone: '0911222333', defendantIdNo: 'B100000002' });
      await createCase(dataSource, { defendantName: '林惡客二號', defendantPhone: '0900000003', defendantIdNo: 'B100000003' });

      const nameRes = await request(app.getHttpServer())
        .get('/v1/cases/search')
        .set('Authorization', bearer(tokenService, user.uid))
        .query({ keyword: '林惡客' })
        .expect(200);
      expect(nameRes.body.data.list.map((item: { id: number }) => item.id)).toEqual([byName.id]);

      const phoneRes = await request(app.getHttpServer())
        .get('/v1/cases/search')
        .set('Authorization', bearer(tokenService, user.uid))
        .query({ keyword: '0911-222-333' })
        .expect(200);
      expect(phoneRes.body.data.list.map((item: { id: number }) => item.id)).toEqual([byPhone.id]);
    });
  });

  describe('GET /v1/cases/detail', () => {
    it('should return the case', async () => {
      const item = await createCase(dataSource, { title: '押金不還' });

      const res = await request(app.getHttpServer()).get('/v1/cases/detail').query({ id: item.id }).expect(200);

      expect(res.body.data).toMatchObject({ id: item.id, title: '押金不還', defendantName: '王*明' });
    });

    it('should return code 20400 when case does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/v1/cases/detail').query({ id: 999999 }).expect(200);
      expect(res.body).toMatchObject({ code: 20400 });
    });
  });

  describe('POST /v1/cases', () => {
    it('should create a case with uploaded images', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/cases')
        .set('Authorization', bearer(tokenService, user.uid))
        .set('X-Forwarded-For', '203.0.113.9')
        .field('title', '欠租三個月')
        .field('content', '簽約後只付了第一個月')
        .field('location', '台北市')
        .field('district', '大安區')
        .field('rent', '18000')
        .field('defendantName', '陳惡客')
        .field('defendantPhone', '0922333444')
        .attach('images', PNG_BYTES, { filename: 'evidence.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000, data: { id: expect.any(Number) } });
      expect(mockStorageService.uploadCaseImages).toHaveBeenCalledTimes(1);
      const saved = await dataSource.getRepository(Case).findOneByOrFail({ id: res.body.data.id });
      expect(saved).toMatchObject({
        plaintiffId: user.uid,
        title: '欠租三個月',
        location: '台北市',
        district: '大安區',
        rent: 18000,
        defendantName: '陳惡客',
        ip: '203.0.113.9',
        imageUrls: ['https://test-bucket.s3.amazonaws.com/cases/test-0.jpg'],
      });
    });

    it('should return code 40000 when district does not belong to the city', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/cases')
        .set('Authorization', bearer(tokenService, user.uid))
        .field('title', 't')
        .field('content', 'c')
        .field('location', '台北市')
        .field('district', '板橋區')
        .field('rent', '1000')
        .field('defendantName', '某人')
        .expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40000 });
      expect(await dataSource.getRepository(Case).count()).toBe(0);
    });

    it('should reject non-image uploads', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/cases')
        .set('Authorization', bearer(tokenService, user.uid))
        .field('title', 't')
        .field('content', 'c')
        .field('location', '台北市')
        .field('district', '大安區')
        .field('rent', '1000')
        .field('defendantName', '某人')
        .attach('images', Buffer.from('#!/bin/sh'), { filename: 'run.sh', contentType: 'application/x-sh' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40000 });
    });

    it('should require login', async () => {
      await request(app.getHttpServer()).post('/v1/cases').field('title', 't').expect(401);
    });
  });
});
