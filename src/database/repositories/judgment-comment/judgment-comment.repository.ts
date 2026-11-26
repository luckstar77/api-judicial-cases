import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JudgmentComment, User } from '../../entities';
import { CommentOrder, CommentVO, CreateCommentInput } from '../interfaces/comment.interface';
import { CreatedVO } from '../interfaces/common.interface';
import { optionalString, RawRow, requiredNumber, requiredString, toDate } from '../row.util';

@Injectable()
export class JudgmentCommentRepository {
  constructor(@InjectRepository(JudgmentComment) private readonly repository: Repository<JudgmentComment>) {}

  async findByFilesetId(filesetId: string, order: CommentOrder): Promise<CommentVO[]> {
    const rows = await this.baseQuery()
      .where('jc.filesetId = :filesetId', { filesetId })
      .orderBy('jc.createdAt', order)
      .addOrderBy('jc.id', order)
      .getRawMany<RawRow>();
    return rows.map((row) => this.toVO(row));
  }

  async findById(id: number): Promise<CommentVO | undefined> {
    const row = await this.baseQuery().where('jc.id = :id', { id }).getRawOne<RawRow>();
    return row ? this.toVO(row) : undefined;
  }

  async create(input: CreateCommentInput<string>): Promise<CreatedVO> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(JudgmentComment)
      .values({ filesetId: input.targetId, userId: input.userId, content: input.content, ip: input.ip })
      .execute();
    return { id: Number(result.identifiers[0]?.id ?? result.raw.insertId) };
  }

  private baseQuery() {
    return this.repository
      .createQueryBuilder('jc')
      .leftJoin(User, 'u', 'u.uid = jc.userId')
      .select('jc.id', 'id')
      .addSelect('jc.content', 'content')
      .addSelect('jc.ip', 'ip')
      .addSelect('jc.createdAt', 'createdAt')
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
