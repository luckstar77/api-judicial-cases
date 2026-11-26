import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CommentOrder } from '../database/repositories/interfaces/comment.interface';
import { CommentResponse } from '../common/dtos/engagement.dto';
import { toCommentResponse } from '../common/utils/comment.util';
import { JudgmentService } from './judgment.service';

export class JudgmentCommentCreateError extends Error {}

export interface CreateJudgmentCommentInput {
  filesetId: string;
  userId: string;
  content: string;
  ip: string;
}

@Injectable()
export class JudgmentCommentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly judgmentService: JudgmentService,
  ) {}

  async list(filesetId: string, order: CommentOrder = 'ASC'): Promise<CommentResponse[]> {
    const comments = await this.databaseService.judgmentCommentRepository.findByFilesetId(filesetId, order);
    return comments.map(toCommentResponse);
  }

  async create(input: CreateJudgmentCommentInput): Promise<CommentResponse> {
    await this.judgmentService.assertExists(input.filesetId);
    const { id } = await this.databaseService.judgmentCommentRepository.create({
      targetId: input.filesetId,
      userId: input.userId,
      content: input.content,
      ip: input.ip,
    });
    const created = await this.databaseService.judgmentCommentRepository.findById(id);
    if (!created) throw new JudgmentCommentCreateError(`comment ${id} was not persisted`);
    return toCommentResponse(created);
  }
}
