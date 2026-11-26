import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createCase, createJudgment, createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { createTestApp } from '../test/test-app';

describe('StatsController / HealthController E2E', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAllDataInDB(dataSource);
  });

  describe('GET /v1/stats', () => {
    it('should return judgment, case and user counts', async () => {
      await createJudgment(dataSource, { id: 'S1' });
      await createJudgment(dataSource, { id: 'S2' });
      await createCase(dataSource);
      await createUser(dataSource);

      const res = await request(app.getHttpServer()).get('/v1/stats').expect(200);

      expect(res.body).toEqual({ status: 'ok', code: 20000, data: { judgmentCount: 2, caseCount: 1, userCount: 2 } });
    });
  });

  describe('health', () => {
    it('should report database status on /v1/health', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
      expect(res.body).toEqual({ status: 'ok', code: 20000, data: { db: 'up' } });
    });

    it('should keep the legacy /health response', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toEqual({ status: 'OK' });
    });
  });

  describe('unknown routes', () => {
    it('should return HTTP 404 with code 40400 under /v1', async () => {
      const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
      expect(res.body).toMatchObject({ status: 'error', code: 40400 });
    });
  });
});
