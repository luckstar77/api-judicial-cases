import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CommentOrder } from '../database/repositories/interfaces/comment.interface';
import { CommentResponse } from '../common/dtos/engagement.dto';
import { toCommentResponse } from '../common/utils/comment.util';
import { CaseService } from './case.service';

export class CaseCommentCreateError extends Error {}

export interface CreateCaseCommentInput {
  caseId: number;
  userId: string;
  content: string;
  ip: string;
}

@Injectable()
export class CaseCommentService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly caseService: CaseService,
  ) {}

  async list(caseId: number, order: CommentOrder = 'ASC'): Promise<CommentResponse[]> {
    const comments = await this.databaseService.caseCommentRepository.findByCaseId(caseId, order);
    return comments.map(toCommentResponse);
  }

  async create(input: CreateCaseCommentInput): Promise<CommentResponse> {
    await this.caseService.assertExists(input.caseId);
    const { id } = await this.databaseService.caseCommentRepository.create({
      targetId: input.caseId,
      userId: input.userId,
      content: input.content,
      ip: input.ip,
    });
    const created = await this.databaseService.caseCommentRepository.findById(id);
    if (!created) throw new CaseCommentCreateError(`case comment ${id} was not persisted`);
    return toCommentResponse(created);
  }
}
