import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities';
import { RegisterUserInput, UpdateUserProfileInput, UpsertPhoneUserInput, UserCredentialVO, UserVO } from '../interfaces/user.interface';

const USER_FIELDS = ['u.uid', 'u.phone', 'u.ip', 'u.name', 'u.email', 'u.displayName'];

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  async findByUid(uid: string): Promise<UserVO | undefined> {
    const row = await this.repository.createQueryBuilder('u').select(USER_FIELDS).where('u.uid = :uid', { uid }).getOne();
    return row ? this.toVO(row) : undefined;
  }

  /** 同一支手機可能因重新驗證而有多筆，優先取已設定密碼的那筆 */
  async findCredentialByPhone(phone: string): Promise<UserCredentialVO | undefined> {
    const row = await this.repository
      .createQueryBuilder('u')
      .select([...USER_FIELDS, 'u.password'])
      .where('u.phone = :phone', { phone })
      .orderBy('u.password IS NULL', 'ASC')
      .addOrderBy('u.uid', 'ASC')
      .getOne();
    return row ? { ...this.toVO(row), passwordHash: row.password ?? undefined } : undefined;
  }

  async findCredentialByUid(uid: string): Promise<UserCredentialVO | undefined> {
    const row = await this.repository
      .createQueryBuilder('u')
      .select([...USER_FIELDS, 'u.password'])
      .where('u.uid = :uid', { uid })
      .getOne();
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

  /**
   * 註冊：
   * 1. 已有同一個 uid（先做過簡訊驗證）→ 更新該筆
   * 2. 同手機有尚未設定密碼的舊資料 → 沿用該筆並換成新的 uid
   * 3. 否則新增
   */
  async register(input: RegisterUserInput): Promise<void> {
    const values = {
      uid: input.uid,
      phone: input.phone,
      ip: input.ip,
      password: input.passwordHash,
      name: input.name,
      displayName: input.displayName,
      email: input.email,
    };

    const sameUid = await this.repository.createQueryBuilder('u').where('u.uid = :uid', { uid: input.uid }).getCount();
    if (sameUid > 0) {
      await this.repository.createQueryBuilder().update(User).set(values).where('uid = :uid', { uid: input.uid }).execute();
      return;
    }

    const legacy = await this.repository
      .createQueryBuilder('u')
      .select(['u.uid'])
      .where('u.phone = :phone', { phone: input.phone })
      .andWhere('u.password IS NULL')
      .orderBy('u.uid', 'ASC')
      .getOne();
    if (legacy) {
      await this.repository.createQueryBuilder().update(User).set(values).where('uid = :uid', { uid: legacy.uid }).execute();
      return;
    }

    await this.repository.createQueryBuilder().insert().into(User).values(values).execute();
  }

  async updateProfile(uid: string, input: UpdateUserProfileInput): Promise<void> {
    const values: Partial<User> = {};
    if (input.displayName !== undefined) values.displayName = input.displayName;
    if (input.email !== undefined) values.email = input.email;
    if (input.passwordHash !== undefined) values.password = input.passwordHash;
    if (Object.keys(values).length === 0) return;
    await this.repository.createQueryBuilder().update(User).set(values).where('uid = :uid', { uid }).execute();
  }

  async updatePasswordHash(uid: string, passwordHash: string): Promise<void> {
    await this.repository.createQueryBuilder().update(User).set({ password: passwordHash }).where('uid = :uid', { uid }).execute();
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  private toVO(row: User): UserVO {
    return {
      uid: row.uid.trim(),
      phone: row.phone.trim(),
      ip: row.ip?.trim() || undefined,
      name: row.name?.trim() || undefined,
      email: row.email?.trim() || undefined,
      displayName: row.displayName ?? undefined,
    };
  }
}
