import request from 'supertest';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import { User } from '../database/entities';
import { createUser, fakeFirebaseUid, fakeTaiwanPhone, legacySha256 } from '../database/test/factory';
import { clearAllDataInDB } from '../database/test/utils';
import { fakeFirebaseToken } from '../firebase/test/mock';
import { createTestApp } from '../test/test-app';
import { TokenService } from '../token/token.service';

describe('AuthController E2E', () => {
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

  describe('POST /v1/auth/verify', () => {
    it('should create the user and return an access token when firebase token is valid', async () => {
      const uid = fakeFirebaseUid();
      const phone = fakeTaiwanPhone();

      const res = await request(app.getHttpServer())
        .post('/v1/auth/verify')
        .set('X-Forwarded-For', '203.0.113.7')
        .send({ firebaseToken: fakeFirebaseToken(uid, phone) })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000, data: { user: { uid, phone } } });
      expect(tokenService.verify(res.body.data.accessToken)).toMatchObject({ uid, phone });
      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid });
      expect(saved.phone).toBe(phone);
      expect(saved.ip).toBe('203.0.113.7');
    });

    it('should return code 40102 when firebase token is invalid', async () => {
      const res = await request(app.getHttpServer()).post('/v1/auth/verify').send({ firebaseToken: 'forged' }).expect(200);
      expect(res.body).toMatchObject({ status: 'error', code: 40102 });
    });

    it('should return code 40000 when firebase token is missing', async () => {
      const res = await request(app.getHttpServer()).post('/v1/auth/verify').send({}).expect(200);
      expect(res.body).toMatchObject({ status: 'error', code: 40000 });
    });
  });

  describe('POST /v1/auth/register', () => {
    const profile = { password: 'p@ssw0rd!', name: '王小明', displayName: '小明', email: 'ming@example.com' };

    it('should register with scrypt password and not expose the hash', async () => {
      const uid = fakeFirebaseUid();
      const phone = fakeTaiwanPhone();

      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ firebaseToken: fakeFirebaseToken(uid, phone), ...profile })
        .expect(201);

      expect(res.body).toMatchObject({
        status: 'ok',
        code: 20000,
        data: { user: { uid, phone, name: profile.name, displayName: profile.displayName, email: profile.email } },
      });
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.body.data.user).not.toHaveProperty('ip');
      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid });
      expect(saved.password?.startsWith('scrypt$')).toBe(true);
    });

    it('should reuse the row created by phone verification', async () => {
      const uid = fakeFirebaseUid();
      const phone = fakeTaiwanPhone();
      await request(app.getHttpServer())
        .post('/v1/auth/verify')
        .send({ firebaseToken: fakeFirebaseToken(uid, phone) })
        .expect(200);

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ firebaseToken: fakeFirebaseToken(uid, phone), ...profile })
        .expect(201);

      expect(await dataSource.getRepository(User).countBy({ phone })).toBe(1);
    });

    it('should return code 40900 when the phone already has a password', async () => {
      const existing = await createUser(dataSource, { plainPassword: 'existing-pass' });

      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ firebaseToken: fakeFirebaseToken(fakeFirebaseUid(), existing.phone), ...profile })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40900 });
    });

    it('should return code 40000 when password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ firebaseToken: fakeFirebaseToken(fakeFirebaseUid(), fakeTaiwanPhone()), ...profile, password: 'short' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40000 });
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login with local phone format', async () => {
      const user = await createUser(dataSource, { phone: '+886912345678', plainPassword: 'my-password' });

      const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ phone: '0912345678', password: 'my-password' }).expect(200);

      expect(res.body).toMatchObject({ status: 'ok', code: 20000, data: { user: { uid: user.uid, phone: user.phone } } });
      expect(tokenService.verify(res.body.data.accessToken)?.uid).toBe(user.uid);
    });

    it('should upgrade a legacy sha256 password to scrypt after successful login', async () => {
      const user = await createUser(dataSource, { password: legacySha256('legacy-password') });

      await request(app.getHttpServer()).post('/v1/auth/login').send({ phone: user.phone, password: 'legacy-password' }).expect(200);

      const saved = await dataSource.getRepository(User).findOneByOrFail({ uid: user.uid });
      expect(saved.password?.startsWith('scrypt$')).toBe(true);
    });

    it('should return code 40101 when password is wrong', async () => {
      const user = await createUser(dataSource, { plainPassword: 'my-password' });

      const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ phone: user.phone, password: 'wrong-password' }).expect(200);

      expect(res.body).toMatchObject({ status: 'error', code: 40101 });
    });

    it('should return code 40101 when phone is not registered', async () => {
      const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ phone: '0987654321', password: 'whatever1' }).expect(200);
      expect(res.body).toMatchObject({ status: 'error', code: 40101 });
    });
  });
});
