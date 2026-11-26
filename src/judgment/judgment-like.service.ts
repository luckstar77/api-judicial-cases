import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LikeStateResponse } from '../common/dtos/engagement.dto';
import { JudgmentService } from './judgment.service';

@Injectable()
export class JudgmentLikeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly judgmentService: JudgmentService,
  ) {}

  async getState(filesetId: string, userId?: string): Promise<LikeStateResponse> {
    const repository = this.databaseService.judgmentLikeRepository;
    const [likeCount, liked] = await Promise.all([repository.countByFilesetId(filesetId), userId ? repository.exists(filesetId, userId) : false]);
    return { likeCount, liked };
  }

  async toggle(filesetId: string, userId: string): Promise<LikeStateResponse> {
    await this.judgmentService.assertExists(filesetId);
    const liked = await this.databaseService.judgmentLikeRepository.toggle(filesetId, userId);
    const likeCount = await this.databaseService.judgmentLikeRepository.countByFilesetId(filesetId);
    return { likeCount, liked };
  }
}
