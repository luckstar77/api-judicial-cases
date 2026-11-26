import { faker } from '@faker-js/faker';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { Case, CaseComment, CaseLike, Judgment, JudgmentComment, JudgmentLike, User } from '../entities';
import { hashPassword } from '../../common/utils/password.util';

/** E2E 專用：在測試資料庫建立真實資料 */
const FIREBASE_UID_LENGTH = 28;
const TAIWAN_MOBILE_DIGITS = 8;

export function fakeFirebaseUid(): string {
  return faker.string.alphanumeric(FIREBASE_UID_LENGTH);
}

export function fakeTaiwanPhone(): string {
  return `+8869${faker.string.numeric(TAIWAN_MOBILE_DIGITS)}`;
}

export async function createUser(dataSource: DataSource, overrides: Partial<User> & { plainPassword?: string } = {}): Promise<User> {
  const { plainPassword, ...fields } = overrides;
  const repository = dataSource.getRepository(User);
  return repository.save(
    repository.create({
      uid: fakeFirebaseUid(),
      phone: fakeTaiwanPhone(),
      ip: faker.internet.ipv4(),
      name: faker.person.fullName().slice(0, 32),
      email: faker.internet.email(),
      displayName: faker.internet.username().slice(0, 30),
      password: plainPassword ? await hashPassword(plainPassword) : undefined,
      ...fields,
    }),
  );
}

export function legacySha256(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function createJudgment(dataSource: DataSource, overrides: Partial<Judgment> = {}): Promise<Judgment> {
  const repository = dataSource.getRepository(Judgment);
  const jyear = String(faker.number.int({ min: 100, max: 113 }));
  const jno = String(faker.number.int({ min: 1, max: 9999 }));
  return repository.save(
    repository.create({
      id: `TPEV,${jyear},北簡,${jno},${faker.date.past({ years: 5 }).toISOString().slice(0, 10).replace(/-/g, '')},1`,
      jyear,
      jcase: '北簡',
      jno,
      jdate: faker.date.past({ years: 5 }).toISOString().slice(0, 10),
      jtitle: '返還租賃物等',
      jfull: faker.lorem.paragraphs(3),
      plaintiff: '房東甲',
      defendant: '房客乙',
      rent: faker.number.int({ min: 5000, max: 40000 }),
      city: '臺北',
      district: '大安區',
      win: 'plaintiff',
      ...overrides,
    }),
  );
}

export async function createCase(dataSource: DataSource, overrides: Partial<Case> = {}): Promise<Case> {
  const repository = dataSource.getRepository(Case);
  if (!overrides.plaintiffId) {
    overrides.plaintiffId = (await createUser(dataSource)).uid;
  }
  return repository.save(
    repository.create({
      title: faker.lorem.sentence({ min: 3, max: 6 }).slice(0, 100),
      content: faker.lorem.paragraph(),
      location: '台北市',
      district: '大安區',
      rent: faker.number.int({ min: 5000, max: 40000 }),
      defendantName: '王小明',
      defendantPhone: '0912345678',
      defendantIdNo: 'A123456789',
      imageUrls: [],
      ip: faker.internet.ipv4(),
      ...overrides,
    }),
  );
}

export async function createCaseComment(dataSource: DataSource, overrides: Partial<CaseComment> & { caseId: number; userId: string }): Promise<CaseComment> {
  const repository = dataSource.getRepository(CaseComment);
  return repository.save(repository.create({ content: faker.lorem.sentence(), ip: faker.internet.ipv4(), ...overrides }));
}

export async function createCaseLike(dataSource: DataSource, overrides: Partial<CaseLike> & { caseId: number; userId: string }): Promise<CaseLike> {
  const repository = dataSource.getRepository(CaseLike);
  return repository.save(repository.create(overrides));
}

export async function createJudgmentComment(
  dataSource: DataSource,
  overrides: Partial<JudgmentComment> & { filesetId: string; userId: string },
): Promise<JudgmentComment> {
  const repository = dataSource.getRepository(JudgmentComment);
  return repository.save(repository.create({ content: faker.lorem.sentence(), ip: faker.internet.ipv4(), ...overrides }));
}

export async function createJudgmentLike(
  dataSource: DataSource,
  overrides: Partial<JudgmentLike> & { filesetId: string; userId: string },
): Promise<JudgmentLike> {
  const repository = dataSource.getRepository(JudgmentLike);
  return repository.save(repository.create(overrides));
}
