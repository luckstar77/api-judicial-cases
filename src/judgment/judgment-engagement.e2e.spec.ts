import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JudgmentComment } from '../database/entities';
import { createJudgment, createJudgmentComment, createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { bearer, createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';

describe('JudgmentCommentController / JudgmentLikeController E2E', () => {
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

  describe('GET /v1/judgment_comments', () => {
    it('should list comments oldest first with masked ip and no email', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource, { displayName: '路人甲' });
      await createJudgmentComment(dataSource, {
        filesetId: judgment.id,
        userId: user.uid,
        content: '第一則',
        ip: '35.78.212.43',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });
      await createJudgmentComment(dataSource, { filesetId: judgment.id, userId: user.uid, content: '第二則', createdAt: new Date('2025-01-02T00:00:00Z') });

      const res = await request(app.getHttpServer()).get('/v1/judgment_comments').query({ filesetId: judgment.id }).expect(200);

      expect(res.body.data.list.map((comment: { content: string }) => comment.content)).toEqual(['第一則', '第二則']);
      expect(res.body.data.list[0]).toEqual({
        id: expect.any(Number),
        content: '第一則',
        authorDisplayName: '路人甲',
        ipMasked: '35.78.*.*',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('POST /v1/judgment_comments', () => {
    it('should create a comment with the client ip from the trusted proxy', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource, { displayName: '留言者' });

      const res = await request(app.getHttpServer())
        .post('/v1/judgment_comments')
        .set('Authorization', bearer(tokenService, user.uid))
        .set('X-Forwarded-For', '198.51.100.23')
        .send({ filesetId: judgment.id, content: '  這位房客真的很難搞  ' })
        .expect(201);

      expect(res.body).toMatchObject({
        status: 'ok',
        code: 20000,
        data: { content: '這位房客真的很難搞', authorDisplayName: '留言者', ipMasked: '198.51.*.*' },
      });
      const saved = await dataSource.getRepository(JudgmentComment).findOneByOrFail({ filesetId: judgment.id });
      expect(saved).toMatchObject({ userId: user.uid, ip: '198.51.100.23' });
    });

    it('should return code 20400 when judgment does not exist', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/judgment_comments')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ filesetId: 'missing', content: 'hello' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 20400 });
    });

    it('should require login', async () => {
      await request(app.getHttpServer()).post('/v1/judgment_comments').send({ filesetId: 'x', content: 'hello' }).expect(401);
    });
  });

  describe('judgment likes', () => {
    it('should toggle like and report the state for the current user', async () => {
      const judgment = await createJudgment(dataSource);
      const user = await createUser(dataSource);
      const auth = bearer(tokenService, user.uid);

      const liked = await request(app.getHttpServer())
        .post('/v1/judgment_likes/toggle')
        .set('Authorization', auth)
        .send({ filesetId: judgment.id })
        .expect(200);
      expect(liked.body.data).toEqual({ likeCount: 1, liked: true });

      const mine = await request(app.getHttpServer()).get('/v1/judgment_likes').set('Authorization', auth).query({ filesetId: judgment.id }).expect(200);
      expect(mine.body.data).toEqual({ likeCount: 1, liked: true });

      const anonymous = await request(app.getHttpServer()).get('/v1/judgment_likes').query({ filesetId: judgment.id }).expect(200);
      expect(anonymous.body.data).toEqual({ likeCount: 1, liked: false });

      const unliked = await request(app.getHttpServer())
        .post('/v1/judgment_likes/toggle')
        .set('Authorization', auth)
        .send({ filesetId: judgment.id })
        .expect(200);
      expect(unliked.body.data).toEqual({ likeCount: 0, liked: false });
    });

    it('should return code 20400 when liking a missing judgment', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .post('/v1/judgment_likes/toggle')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ filesetId: 'missing' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 20400 });
    });
  });
});
