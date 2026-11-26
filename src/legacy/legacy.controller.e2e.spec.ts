import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CaseComment, User } from '../database/entities';
import { createCase, createJudgment, createJudgmentComment, createUser, fakeFirebaseUid, fakeTaiwanPhone, legacySha256 } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { fakeFirebaseToken } from '../firebase/test/mock';
import { bearer, createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';

/** 舊前端（CRA 版）使用的未加版號路徑：回傳格式必須維持原樣 */
describe('LegacyController E2E', () => {
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

  describe('judgments', () => {
    it('GET /cases?search= should return the raw judgment array with full text', async () => {
      const judgment = await createJudgment(dataSource, { plaintiff: '張淑晶', jfull: '判決全文' });

      const res = await request(app.getHttpServer()).get('/cases').query({ search: '張淑晶' }).expect(200);

      expect(res.body).toEqual([
        {
          id: judgment.id,
          plaintiff: '張淑晶',
          defendant: judgment.defendant,
          rent: judgment.rent,
          city: judgment.city,
          win: judgment.win,
          jyear: judgment.jyear,
          jfull: '判決全文',
          jtitle: judgment.jtitle,
        },
      ]);
    });

    it('GET /cases?search=% should not dump every judgment', async () => {
      await createJudgment(dataSource);
      const res = await request(app.getHttpServer()).get('/cases').query({ search: '%' }).expect(200);
      expect(res.body).toEqual([]);
    });

    it('GET /name should return name counts', async () => {
      await createJudgment(dataSource, { id: 'N1', city: '臺北', rent: 10000, win: 'plaintiff', defendant: '惡房客' });
      await createJudgment(dataSource, { id: 'N2', city: '臺北', rent: 10000, win: 'plaintiff', defendant: '惡房客' });

      const res = await request(app.getHttpServer()).get('/name').query({ city: '臺北', rentMin: 0, rentMax: 20000, score: 2 }).expect(200);

      expect(res.body).toEqual([{ name: '惡房客', count: 2 }]);
    });
  });

  describe('judgment comments and likes', () => {
    it('GET /comment/:filesetId should return comments newest first without email', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource, { displayName: '甲', email: 'hidden@example.com' });
      await createJudgmentComment(dataSource, { filesetId: judgment.id, userId: user.uid, content: '舊', createdAt: new Date('2024-01-01T00:00:00Z') });
      await createJudgmentComment(dataSource, { filesetId: judgment.id, userId: user.uid, content: '新', createdAt: new Date('2024-02-01T00:00:00Z') });

      const res = await request(app.getHttpServer())
        .get(`/comment/${encodeURIComponent(judgment.id)}`)
        .expect(200);

      expect(res.body.map((comment: { content: string }) => comment.content)).toEqual(['新', '舊']);
      expect(res.body[0]).toMatchObject({ filesetId: judgment.id, displayName: '甲' });
      expect(JSON.stringify(res.body)).not.toContain('hidden@example.com');
    });

    it('POST /comment should create a comment and return 201', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource, { displayName: '乙' });

      const res = await request(app.getHttpServer())
        .post('/comment')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ filesetId: judgment.id, content: '留言' })
        .expect(201);

      expect(res.body).toMatchObject({ filesetId: judgment.id, content: '留言', displayName: '乙' });
    });

    it('likes endpoints should keep { liked } / { count } shapes', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource);
      const path = `/likes/${encodeURIComponent(judgment.id)}`;

      const toggled = await request(app.getHttpServer()).post(path).set('Authorization', bearer(tokenService, user.uid)).expect(200);
      expect(toggled.body).toEqual({ liked: true });
      expect((await request(app.getHttpServer()).get(path).expect(200)).body).toEqual({ count: 1 });
      expect((await request(app.getHttpServer()).get(`${path}/status`).set('Authorization', bearer(tokenService, user.uid)).expect(200)).body).toEqual({
        liked: true,
      });
    });
  });

  describe('cases', () => {
    it('GET /case should return a masked array and /case/pages the page count', async () => {
      for (let index = 0; index < 3; index += 1) {
        await createCase(dataSource, { createdAt: new Date(`2025-01-0${index + 1}T00:00:00Z`) });
      }

      const list = await request(app.getHttpServer()).get('/case').query({ page: 1, pageSize: 2 }).expect(200);
      expect(list.body).toHaveLength(2);
      expect(list.body[0]).toMatchObject({ defendantName: '王*明', defendantPhone: '09*****678' });
      expect(list.body[0]).not.toHaveProperty('email');
      expect(list.body[0]).not.toHaveProperty('ip');
      expect(list.body[0]).not.toHaveProperty('plaintiffId');

      const pages = await request(app.getHttpServer()).get('/case/pages').query({ pageSize: 2 }).expect(200);
      expect(pages.body).toEqual({ totalPages: 2 });
    });

    it('GET /case/:id should include comments and likeCount', async () => {
      const item = await createCase(dataSource);
      const user = await createUser(dataSource, { displayName: '丙' });
      const auth = bearer(tokenService, user.uid);

      await request(app.getHttpServer()).post(`/case/${item.id}/comments`).set('Authorization', auth).send({ content: '好慘' }).expect(201);
      const like = await request(app.getHttpServer()).post(`/case/${item.id}/like`).set('Authorization', auth).expect(200);
      expect(like.body).toEqual({ liked: true });

      const res = await request(app.getHttpServer()).get(`/case/${item.id}`).expect(200);

      expect(res.body).toMatchObject({ id: item.id, likeCount: 1, comments: [{ content: '好慘', displayName: '丙' }] });
      expect(await dataSource.getRepository(CaseComment).count()).toBe(1);
      const status = await request(app.getHttpServer()).get(`/case/${item.id}/like/status`).set('Authorization', auth).expect(200);
      expect(status.body).toEqual({ liked: true });
    });

    it('GET /case/search/:search should require login', async () => {
      await request(app.getHttpServer()).get('/case/search/王小明').expect(401);
    });

    it('POST /case should create a case', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/case')
        .set('Authorization', bearer(tokenService, user.uid))
        .field('title', '標題')
        .field('content', '內容')
        .field('location', '台北市')
        .field('district', '大安區')
        .field('rent', '12000')
        .field('defendantName', '某人')
        .expect(201);

      expect(res.body).toEqual({ id: expect.any(Number) });
    });
  });

  describe('users', () => {
    it('POST /user/login should return the user row with token (legacy sha256 password)', async () => {
      const user = await createUser(dataSource, { password: legacySha256('old-password') });

      const res = await request(app.getHttpServer()).post('/user/login').send({ phone: user.phone, password: 'old-password' }).expect(200);

      expect(res.body).toMatchObject({ uid: user.uid, phone: user.phone, displayName: user.displayName, token: expect.any(String) });
      expect(res.body).not.toHaveProperty('password');
    });

    it('POST /user/login should return 401 for wrong password', async () => {
      const user = await createUser(dataSource, { plainPassword: 'right-password' });
      await request(app.getHttpServer()).post('/user/login').send({ phone: user.phone, password: 'wrong' }).expect(401);
    });

    it('POST /user/verify and GET /user should work with the returned token', async () => {
      const uid = fakeFirebaseUid();
      const phone = fakeTaiwanPhone();

      const verify = await request(app.getHttpServer())
        .post('/user/verify')
        .send({ token: fakeFirebaseToken(uid, phone) })
        .expect(200);
      expect(verify.body).toMatchObject({ uid, phone, token: expect.any(String) });

      const me = await request(app.getHttpServer()).get('/user').set('Authorization', `Bearer ${verify.body.token}`).expect(200);
      expect(me.body).toMatchObject({ uid, phone });
      expect(me.body).not.toHaveProperty('password');
    });

    it('POST /user/register then PUT /user should update the profile', async () => {
      const uid = fakeFirebaseUid();
      const phone = fakeTaiwanPhone();

      const registered = await request(app.getHttpServer())
        .post('/user/register')
        .send({ token: fakeFirebaseToken(uid, phone), password: 'register-pass', name: '新用戶', displayName: '新新', email: 'n@example.com' })
        .expect(201);
      expect(registered.body).toMatchObject({ uid, phone, name: '新用戶', displayName: '新新', email: 'n@example.com', token: expect.any(String) });

      const updated = await request(app.getHttpServer())
        .put('/user')
        .set('Authorization', `Bearer ${registered.body.token}`)
        .send({ displayName: '改名' })
        .expect(200);
      expect(updated.body).toMatchObject({ uid, displayName: '改名', token: expect.any(String) });
      expect((await dataSource.getRepository(User).findOneByOrFail({ uid })).displayName).toBe('改名');
    });

    it('PUT /user should return 401 and keep the password when currentPassword is missing', async () => {
      const user = await createUser(dataSource, { plainPassword: 'old-password' });

      await request(app.getHttpServer()).put('/user').set('Authorization', bearer(tokenService, user.uid)).send({ password: 'new-password' }).expect(401);

      const login = await request(app.getHttpServer()).post('/user/login').send({ phone: user.phone, password: 'old-password' });
      expect(login.status).toBe(200);
    });

    it('PUT /user should change the password with the correct currentPassword', async () => {
      const user = await createUser(dataSource, { plainPassword: 'old-password' });

      await request(app.getHttpServer())
        .put('/user')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ password: 'new-password', currentPassword: 'old-password' })
        .expect(200);

      await request(app.getHttpServer()).post('/user/login').send({ phone: user.phone, password: 'new-password' }).expect(200);
    });
  });
});
