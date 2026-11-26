import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CaseCommentRepository } from './repositories/case-comment/case-comment.repository';
import { CaseLikeRepository } from './repositories/case-like/case-like.repository';
import { CaseRepository } from './repositories/case/case.repository';
import { JudgmentCommentRepository } from './repositories/judgment-comment/judgment-comment.repository';
import { JudgmentLikeRepository } from './repositories/judgment-like/judgment-like.repository';
import { JudgmentRepository } from './repositories/judgment/judgment.repository';
import { UserRepository } from './repositories/user/user.repository';

/** 所有資料庫存取的唯一入口：service 只注入 DatabaseService，不直接注入 repository */
@Injectable()
export class DatabaseService {
  constructor(
    private readonly dataSource: DataSource,
    readonly userRepository: UserRepository,
    readonly judgmentRepository: JudgmentRepository,
    readonly judgmentCommentRepository: JudgmentCommentRepository,
    readonly judgmentLikeRepository: JudgmentLikeRepository,
    readonly caseRepository: CaseRepository,
    readonly caseCommentRepository: CaseCommentRepository,
    readonly caseLikeRepository: CaseLikeRepository,
  ) {}

  async ping(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }
}
