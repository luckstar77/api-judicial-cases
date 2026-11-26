import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CaseComment, CaseLike } from '../database/entities';
import { createCase, createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { bearer, createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';

/** 這組測試同時驗證 caseComments / caseLikes 的主鍵修正 migration（正式環境原本無法新增） */
describe('CaseCommentController / CaseLikeController E2E', () => {
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

  describe('case comments', () => {
    it('should create comments and list them oldest first', async () => {
      const item = await createCase(dataSource);
      const user = await createUser(dataSource, { displayName: '鄰居' });
      const auth = bearer(tokenService, user.uid);

      const first = await request(app.getHttpServer())
        .post('/v1/case_comments')
        .set('Authorization', auth)
        .set('X-Forwarded-For', '35.78.212.43')
        .send({ caseId: item.id, content: '我也遇過' })
        .expect(201);
      await request(app.getHttpServer()).post('/v1/case_comments').set('Authorization', auth).send({ caseId: item.id, content: '加一' }).expect(201);

      expect(first.body.data).toMatchObject({ content: '我也遇過', authorDisplayName: '鄰居', ipMasked: '35.78.*.*', createdAt: expect.any(String) });

      const res = await request(app.getHttpServer()).get('/v1/case_comments').query({ caseId: item.id }).expect(200);
      expect(res.body.data.list.map((comment: { content: string }) => comment.content)).toEqual(['我也遇過', '加一']);
      expect(await dataSource.getRepository(CaseComment).count()).toBe(2);
    });

    it('should return code 20400 when case does not exist', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/case_comments')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ caseId: 424242, content: 'hello' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 20400 });
    });

    it('should return code 40000 when content is empty after trimming', async () => {
      const item = await createCase(dataSource);
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/case_comments')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ caseId: item.id, content: '   ' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 40000 });
    });
  });

  describe('case likes', () => {
    it('should toggle like once per user', async () => {
      const item = await createCase(dataSource);
      const alice = await createUser(dataSource);
      const bob = await createUser(dataSource);

      await request(app.getHttpServer())
        .post('/v1/case_likes/toggle')
        .set('Authorization', bearer(tokenService, alice.uid))
        .send({ caseId: item.id })
        .expect(200);
      const bobRes = await request(app.getHttpServer())
        .post('/v1/case_likes/toggle')
        .set('Authorization', bearer(tokenService, bob.uid))
        .send({ caseId: item.id })
        .expect(200);
      expect(bobRes.body.data).toEqual({ likeCount: 2, liked: true });

      const aliceAgain = await request(app.getHttpServer())
        .post('/v1/case_likes/toggle')
        .set('Authorization', bearer(tokenService, alice.uid))
        .send({ caseId: item.id })
        .expect(200);
      expect(aliceAgain.body.data).toEqual({ likeCount: 1, liked: false });

      const state = await request(app.getHttpServer())
        .get('/v1/case_likes')
        .set('Authorization', bearer(tokenService, bob.uid))
        .query({ caseId: item.id })
        .expect(200);
      expect(state.body.data).toEqual({ likeCount: 1, liked: true });
      expect(await dataSource.getRepository(CaseLike).count()).toBe(1);
    });
  });
});
