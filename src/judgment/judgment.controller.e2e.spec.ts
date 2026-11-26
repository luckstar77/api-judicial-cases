import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createJudgment, createJudgmentComment, createJudgmentLike, createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { createTestApp } from '../test/test-app';

describe('JudgmentController E2E', () => {
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

  describe('GET /v1/judgments', () => {
    it('should return judgments where the name is plaintiff or defendant, newest first', async () => {
      const older = await createJudgment(dataSource, { id: 'J-OLD', plaintiff: '張淑晶', jdate: '2015-01-01' });
      const newer = await createJudgment(dataSource, { id: 'J-NEW', defendant: '張淑晶', jdate: '2020-06-30' });
      await createJudgment(dataSource, { id: 'J-OTHER', plaintiff: '李大華', defendant: '陳小美' });
      const user = await createUser(dataSource);
      await createJudgmentLike(dataSource, { filesetId: newer.id, userId: user.uid });
      await createJudgmentComment(dataSource, { filesetId: newer.id, userId: user.uid });

      const res = await request(app.getHttpServer()).get('/v1/judgments').query({ keyword: '張淑晶' }).expect(200);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000 });
      expect(res.body.data.list.map((item: { id: string }) => item.id)).toEqual([newer.id, older.id]);
      expect(res.body.data.list[0]).toMatchObject({ jdate: '2020-06-30', likeCount: 1, commentCount: 1, defendant: '張淑晶' });
      expect(res.body.data.list[0]).not.toHaveProperty('jfull');
      expect(res.body.data.meta).toMatchObject({ page: 1, take: 10, totalCount: 2, pageCount: 1, hasNextPage: false });
    });

    it('should paginate results', async () => {
      for (let index = 0; index < 3; index += 1) {
        await createJudgment(dataSource, { id: `J-${index}`, plaintiff: '同名', jdate: `2020-01-0${index + 1}` });
      }

      const res = await request(app.getHttpServer()).get('/v1/judgments').query({ keyword: '同名', page: 2, limit: 2 }).expect(200);

      expect(res.body.data.list.map((item: { id: string }) => item.id)).toEqual(['J-0']);
      expect(res.body.data.meta).toMatchObject({ page: 2, take: 2, itemCount: 1, totalCount: 3, pageCount: 2, hasPreviousPage: true, hasNextPage: false });
    });

    it('should treat SQL wildcards literally', async () => {
      await createJudgment(dataSource, { plaintiff: '王大明' });

      const res = await request(app.getHttpServer()).get('/v1/judgments').query({ keyword: '%' }).expect(200);

      expect(res.body.data.list).toHaveLength(0);
    });

    it('should return code 40000 when keyword is missing or limit exceeds 50', async () => {
      const missing = await request(app.getHttpServer()).get('/v1/judgments').expect(200);
      expect(missing.body).toMatchObject({ status: 'error', code: 40000 });

      const tooLarge = await request(app.getHttpServer()).get('/v1/judgments').query({ keyword: '王', limit: 51 }).expect(200);
      expect(tooLarge.body).toMatchObject({ status: 'error', code: 40000 });
    });
  });

  describe('GET /v1/judgments/detail', () => {
    it('should return full text of the judgment', async () => {
      const judgment = await createJudgment(dataSource, { jfull: '主文：被告應給付原告新臺幣...', jpdf: 'https://judgment.judicial.gov.tw/x.pdf' });

      const res = await request(app.getHttpServer()).get('/v1/judgments/detail').query({ id: judgment.id }).expect(200);

      expect(res.body.data).toMatchObject({
        id: judgment.id,
        jfull: '主文：被告應給付原告新臺幣...',
        jpdf: 'https://judgment.judicial.gov.tw/x.pdf',
        likeCount: 0,
      });
    });

    it('should return code 20400 when judgment does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/v1/judgments/detail').query({ id: 'NOPE' }).expect(200);
      expect(res.body).toMatchObject({ code: 20400 });
    });
  });

  describe('GET /v1/judgments/warning_names', () => {
    it('should count losing parties within the city and rent range', async () => {
      await createJudgment(dataSource, { id: 'W1', city: '臺北', rent: 10000, win: 'plaintiff', plaintiff: '房東', defendant: '惡房客' });
      await createJudgment(dataSource, { id: 'W2', city: '臺北', rent: 12000, win: 'plaintiff', plaintiff: '房東二', defendant: '惡房客' });
      await createJudgment(dataSource, { id: 'W3', city: '臺北', rent: 15000, win: 'defendant', plaintiff: '惡房東', defendant: '房客' });
      await createJudgment(dataSource, { id: 'W4', city: '臺北', rent: 90000, win: 'plaintiff', plaintiff: '房東', defendant: '惡房客' });
      await createJudgment(dataSource, { id: 'W5', city: '高雄', rent: 10000, win: 'plaintiff', plaintiff: '房東', defendant: '惡房客' });
      await createJudgment(dataSource, { id: 'W6', city: '臺北', rent: 10000, win: 'plaintiff', plaintiff: '房東', defendant: '王○明' });
      await createJudgment(dataSource, { id: 'W7', city: '臺北', rent: 10000, win: 'plaintiff', plaintiff: '房東', defendant: '王○明' });

      const res = await request(app.getHttpServer())
        .get('/v1/judgments/warning_names')
        .query({ city: '台北市', rentMin: 5000, rentMax: 20000, minCount: 1 })
        .expect(200);

      expect(res.body.data.list).toEqual([
        { name: '惡房客', judgmentCount: 2 },
        { name: '惡房東', judgmentCount: 1 },
      ]);
    });

    it('should apply minCount default of 2', async () => {
      await createJudgment(dataSource, { id: 'M1', city: '臺中', rent: 10000, win: 'plaintiff', defendant: '一次' });

      const res = await request(app.getHttpServer()).get('/v1/judgments/warning_names').query({ city: '臺中' }).expect(200);

      expect(res.body.data.list).toEqual([]);
    });
  });

  describe('GET /v1/judgments/city_stats', () => {
    it('should count judgments per known city', async () => {
      await createJudgment(dataSource, { id: 'C1', city: '臺北' });
      await createJudgment(dataSource, { id: 'C2', city: '臺北' });
      await createJudgment(dataSource, { id: 'C3', city: '高雄' });
      await createJudgment(dataSource, { id: 'C4', city: '新此' });

      const res = await request(app.getHttpServer()).get('/v1/judgments/city_stats').expect(200);

      expect(res.body.data.list).toEqual([
        { city: '臺北', judgmentCount: 2 },
        { city: '高雄', judgmentCount: 1 },
      ]);
    });
  });
});
