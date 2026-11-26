import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { User } from '../database/entities';
import { createUser } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { bearer, createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';
import { verifyPassword } from '../common/utils/password.util';

describe('UserController E2E', () => {
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

  describe('GET /v1/users/me', () => {
    it('should return HTTP 401 with code 40100 when not logged in', async () => {
      const res = await request(app.getHttpServer()).get('/v1/users/me').expect(401);
      expect(res.body).toMatchObject({ status: 'error', code: 40100 });
    });

    it('should return the profile without password or ip', async () => {
      const user = await createUser(dataSource, { plainPassword: 'secret-pass' });

      const res = await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', bearer(tokenService, user.uid)).expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        code: 20000,
        data: { uid: user.uid, phone: user.phone, name: user.name, displayName: user.displayName, email: user.email },
      });
    });

    it('should accept tokens issued by the previous backend', async () => {
      const user = await createUser(dataSource);
      const legacyToken = app
        .get(JwtService)
        .sign({ uid: user.uid, phone: user.phone, ip: '1.2.3.4', name: user.name, email: user.email }, { expiresIn: '1y' });

      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', `Bearer ${legacyToken}`).expect(200);
    });

    it('should return HTTP 401 when token is signed with another secret', async () => {
      const forged = new JwtService({ secret: 'another-secret' }).sign({ uid: 'someone', phone: '+886900000000' });
      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', `Bearer ${forged}`).expect(401);
    });
  });

  describe('PATCH /v1/users/me', () => {
    it('should update profile fields and return a refreshed token', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .patch('/v1/users/me')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ displayName: '新暱稱', email: 'new@example.com', password: 'new-password' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000, data: { user: { uid: user.uid, displayName: '新暱稱', email: 'new@example.com' } } });
      expect(tokenService.verify(res.body.data.accessToken)).toMatchObject({ uid: user.uid, displayName: '新暱稱' });
      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid: user.uid });
      await expect(verifyPassword('new-password', saved.password)).resolves.toMatchObject({ isValid: true });
    });

    it('should return code 40000 when email is invalid', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .patch('/v1/users/me')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ email: 'not-an-email' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40000 });
    });
  });
});
