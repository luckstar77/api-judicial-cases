import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JudgmentLike } from '../../entities';

@Injectable()
export class JudgmentLikeRepository {
  constructor(@InjectRepository(JudgmentLike) private readonly repository: Repository<JudgmentLike>) {}

  countByFilesetId(filesetId: string): Promise<number> {
    return this.repository.createQueryBuilder('jl').where('jl.filesetId = :filesetId', { filesetId }).getCount();
  }

  async exists(filesetId: string, userId: string): Promise<boolean> {
    const total = await this.repository.createQueryBuilder('jl').where('jl.filesetId = :filesetId AND jl.userId = :userId', { filesetId, userId }).getCount();
    return total > 0;
  }

  /** 已按讚就取消、否則按讚；回傳操作後是否為已按讚。likes 表有 (userId, filesetId) 唯一索引 */
  async toggle(filesetId: string, userId: string): Promise<boolean> {
    const deleted = await this.repository
      .createQueryBuilder()
      .delete()
      .from(JudgmentLike)
      .where('filesetId = :filesetId AND userId = :userId', { filesetId, userId })
      .execute();
    if ((deleted.affected ?? 0) > 0) return false;
    await this.repository.createQueryBuilder().insert().into(JudgmentLike).values({ filesetId, userId }).orIgnore().execute();
    return true;
  }
}
