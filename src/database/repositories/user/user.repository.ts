import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { User } from '../../entities';
import { RegisterUserInput, UpdateUserProfileInput, UpsertPhoneUserInput, UserCredentialVO, UserVO } from '../interfaces/user.interface';

const USER_FIELDS = ['u.uid', 'u.phone', 'u.ip', 'u.name', 'u.email', 'u.displayName', 'u.password', 'u.tokenVersion'];

/** mysql2 INSERT 結果 */
interface InsertResultHeader {
  affectedRows?: number;
}

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  async findByUid(uid: string): Promise<UserVO | undefined> {
    const row = await this.repository.createQueryBuilder('u').select(USER_FIELDS).where('u.uid = :uid', { uid }).getOne();
    return row ? this.toVO(row) : undefined;
  }

  async findTokenVersion(uid: string): Promise<number | undefined> {
    const row = await this.repository.createQueryBuilder('u').select(['u.uid', 'u.tokenVersion']).where('u.uid = :uid', { uid }).getOne();
    return row ? row.tokenVersion : undefined;
  }

  /** 同一支手機可能因重新驗證而有多筆，優先取已設定密碼的那筆 */
  async findCredentialByPhone(phone: string): Promise<UserCredentialVO | undefined> {
    const row = await this.repository
      .createQueryBuilder('u')
      .select(USER_FIELDS)
      .where('u.phone = :phone', { phone })
      .orderBy('u.password IS NULL', 'ASC')
      .addOrderBy('u.uid', 'ASC')
      .getOne();
    return row ? { ...this.toVO(row), passwordHash: row.password ?? undefined } : undefined;
  }

  async findCredentialByUid(uid: string): Promise<UserCredentialVO | undefined> {
    const row = await this.repository.createQueryBuilder('u').select(USER_FIELDS).where('u.uid = :uid', { uid }).getOne();
    return row ? { ...this.toVO(row), passwordHash: row.password ?? undefined } : undefined;
  }

  async hasPasswordForPhone(phone: string): Promise<boolean> {
    const total = await this.repository.createQueryBuilder('u').where('u.phone = :phone', { phone }).andWhere('u.password IS NOT NULL').getCount();
    return total > 0;
  }

  /** 手機簡訊驗證登入：以 Firebase uid 為主鍵新增或更新 */
  async upsertPhoneUser(input: UpsertPhoneUserInput): Promise<void> {
    await this.repository.createQueryBuilder().insert().into(User).values(input).orUpdate(['ip', 'phone'], ['uid']).execute();
  }

  /** 只更新尚未設定密碼的那筆（單一 UPDATE，並發註冊時只有一個會成功）；回傳是否有更新 */
  async completeRegistration(input: RegisterUserInput): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(User)
      .set(this.toRegistrationValues(input))
      .where('uid = :uid', { uid: input.uid })
      .andWhere('password IS NULL')
      .execute();
    return (result.affected ?? 0) > 0;
  }

  /** uid 已存在時不寫入（INSERT IGNORE）；回傳是否有新增 */
  async insertRegisteredUser(input: RegisterUserInput): Promise<boolean> {
    const result = await this.repository.createQueryBuilder().insert().into(User).values(this.toRegistrationValues(input)).orIgnore().execute();
    const header = result.raw as InsertResultHeader;
    return (header.affectedRows ?? 0) > 0;
  }

  /** 有新密碼時 tokenVersion + 1，之前簽發的 token 全部失效 */
  async updateProfile(uid: string, input: UpdateUserProfileInput): Promise<void> {
    const values: QueryDeepPartialEntity<User> = {};
    if (input.displayName !== undefined) values.displayName = input.displayName;
    if (input.email !== undefined) values.email = input.email;
    if (input.passwordHash !== undefined) {
      values.password = input.passwordHash;
      values.tokenVersion = () => 'tokenVersion + 1';
    }
    if (Object.keys(values).length === 0) return;
    await this.repository.createQueryBuilder().update(User).set(values).where('uid = :uid', { uid }).execute();
  }

  /** 舊格式密碼升級：密碼本身沒變，不影響已簽發的 token */
  async updatePasswordHash(uid: string, passwordHash: string): Promise<void> {
    await this.repository.createQueryBuilder().update(User).set({ password: passwordHash }).where('uid = :uid', { uid }).execute();
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  private toRegistrationValues(input: RegisterUserInput): QueryDeepPartialEntity<User> {
    return {
      uid: input.uid,
      phone: input.phone,
      ip: input.ip,
      password: input.passwordHash,
      name: input.name,
      displayName: input.displayName,
      email: input.email,
    };
  }

  private toVO(row: User): UserVO {
    return {
      uid: row.uid.trim(),
      phone: row.phone.trim(),
      ip: row.ip?.trim() || undefined,
      name: row.name?.trim() || undefined,
      email: row.email?.trim() || undefined,
      displayName: row.displayName ?? undefined,
      hasPassword: Boolean(row.password),
      tokenVersion: row.tokenVersion ?? 0,
    };
  }
}
