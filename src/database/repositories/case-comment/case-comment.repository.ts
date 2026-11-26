import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaseComment, User } from '../../entities';
import { CommentOrder, CommentVO, CreateCommentInput } from '../interfaces/comment.interface';
import { CreatedVO } from '../interfaces/common.interface';
import { optionalString, RawRow, requiredNumber, requiredString, toDate } from '../row.util';

@Injectable()
export class CaseCommentRepository {
  constructor(@InjectRepository(CaseComment) private readonly repository: Repository<CaseComment>) {}

  async findByCaseId(caseId: number, order: CommentOrder): Promise<CommentVO[]> {
    const rows = await this.baseQuery().where('cc.caseId = :caseId', { caseId }).orderBy('cc.createdAt', order).addOrderBy('cc.id', order).getRawMany<RawRow>();
    return rows.map((row) => this.toVO(row));
  }

  async findById(id: number): Promise<CommentVO | undefined> {
    const row = await this.baseQuery().where('cc.id = :id', { id }).getRawOne<RawRow>();
    return row ? this.toVO(row) : undefined;
  }

  async create(input: CreateCommentInput<number>): Promise<CreatedVO> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(CaseComment)
      .values({ caseId: input.targetId, userId: input.userId, content: input.content, ip: input.ip })
      .execute();
    return { id: Number(result.identifiers[0]?.id ?? result.raw.insertId) };
  }

  private baseQuery() {
    return this.repository
      .createQueryBuilder('cc')
      .leftJoin(User, 'u', 'u.uid = cc.userId')
      .select('cc.id', 'id')
      .addSelect('cc.content', 'content')
      .addSelect('cc.ip', 'ip')
      .addSelect('cc.createdAt', 'createdAt')
      .addSelect('u.displayName', 'authorDisplayName');
  }

  private toVO(row: RawRow): CommentVO {
    return {
      id: requiredNumber(row.id),
      content: requiredString(row.content),
      authorDisplayName: optionalString(row.authorDisplayName),
      ip: optionalString(row.ip),
      createdAt: toDate(row.createdAt),
    };
  }
}
