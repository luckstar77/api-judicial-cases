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
        data: { uid: user.uid, phone: user.phone, name: user.name, displayName: user.displayName, email: user.email, hasPassword: true },
      });
    });

    it('should report hasPassword false when the account only used SMS login', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', bearer(tokenService, user.uid)).expect(200);

      expect(res.body.data.hasPassword).toBe(false);
    });

    it('should return HTTP 401 when the token belongs to a deleted account', async () => {
      const user = await createUser(dataSource);
      const token = bearer(tokenService, user.uid);
      await dataSource.getRepository(User).delete({ uid: user.uid });

      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', token).expect(401);
    });

    it('should not put personal data into the token payload', async () => {
      const user = await createUser(dataSource, { plainPassword: 'secret-pass' });

      const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ phone: user.phone, password: 'secret-pass' }).expect(200);

      const payload = app.get(JwtService).decode<Record<string, unknown>>(res.body.data.accessToken);
      expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'tv', 'uid']);
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
      const user = await createUser(dataSource, { plainPassword: 'old-password' });

      const res = await request(app.getHttpServer())
        .patch('/v1/users/me')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ displayName: '新暱稱', email: 'new@example.com', password: 'new-password', currentPassword: 'old-password' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000, data: { user: { uid: user.uid, displayName: '新暱稱', email: 'new@example.com' } } });
      await expect(tokenService.authenticate(res.body.data.accessToken)).resolves.toEqual({ uid: user.uid });
      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid: user.uid });
      await expect(verifyPassword('new-password', saved.password)).resolves.toMatchObject({ isValid: true });
    });

    it('should return code 40101 and keep the password when current password is missing or wrong', async () => {
      const user = await createUser(dataSource, { plainPassword: 'old-password' });
      const token = bearer(tokenService, user.uid);

      for (const currentPassword of [undefined, 'wrong-password']) {
        const res = await request(app.getHttpServer()).patch('/v1/users/me').set('Authorization', token).send({ password: 'new-password', currentPassword }).expect(200);
        expect(res.body).toMatchObject({ status: 'error', code: 40101 });
      }

      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid: user.uid });
      await expect(verifyPassword('old-password', saved.password)).resolves.toMatchObject({ isValid: true });
      expect(saved.tokenVersion).toBe(0);
    });

    it('should let an SMS-only account set its first password without a current password', async () => {
      const user = await createUser(dataSource);

      const res = await request(app.getHttpServer())
        .patch('/v1/users/me')
        .set('Authorization', bearer(tokenService, user.uid))
        .send({ password: 'first-password' })
        .expect(200);

      expect(res.body).toMatchObject({ code: 20000, data: { user: { hasPassword: true } } });
    });

    it('should revoke previously issued tokens after a password change', async () => {
      const user = await createUser(dataSource, { plainPassword: 'old-password' });
      const oldToken = bearer(tokenService, user.uid);

      const res = await request(app.getHttpServer())
        .patch('/v1/users/me')
        .set('Authorization', oldToken)
        .send({ password: 'new-password', currentPassword: 'old-password' })
        .expect(200);

      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', oldToken).expect(401);
      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', `Bearer ${res.body.data.accessToken}`).expect(200);
    });

    it('should keep tokens valid when only the profile changes', async () => {
      const user = await createUser(dataSource, { plainPassword: 'old-password' });
      const token = bearer(tokenService, user.uid);

      await request(app.getHttpServer()).patch('/v1/users/me').set('Authorization', token).send({ displayName: '只改暱稱' }).expect(200);

      await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', token).expect(200);
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
