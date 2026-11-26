import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseLike } from '../../entities';

@Injectable()
export class CaseLikeRepository {
  constructor(@InjectRepository(CaseLike) private readonly repository: Repository<CaseLike>) {}

  countByCaseId(caseId: number): Promise<number> {
    return this.repository.createQueryBuilder('cl').where('cl.caseId = :caseId', { caseId }).getCount();
  }

  async exists(caseId: number, userId: string): Promise<boolean> {
    const total = await this.repository.createQueryBuilder('cl').where('cl.caseId = :caseId AND cl.userId = :userId', { caseId, userId }).getCount();
    return total > 0;
  }

  /** 已按讚就取消、否則按讚；回傳操作後是否為已按讚。唯一索引保證同一人不會重複按讚 */
  async toggle(caseId: number, userId: string): Promise<boolean> {
    const deleted = await this.repository
      .createQueryBuilder()
      .delete()
      .from(CaseLike)
      .where('caseId = :caseId AND userId = :userId', { caseId, userId })
      .execute();
    if ((deleted.affected ?? 0) > 0) return false;
    await this.repository.createQueryBuilder().insert().into(CaseLike).values({ caseId, userId }).orIgnore().execute();
    return true;
  }
}
