import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LikeStateResponse } from '../common/dtos/engagement.dto';
import { CaseService } from './case.service';

@Injectable()
export class CaseLikeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly caseService: CaseService,
  ) {}

  async getState(caseId: number, userId?: string): Promise<LikeStateResponse> {
    const repository = this.databaseService.caseLikeRepository;
    const [likeCount, liked] = await Promise.all([repository.countByCaseId(caseId), userId ? repository.exists(caseId, userId) : false]);
    return { likeCount, liked };
  }

  async toggle(caseId: number, userId: string): Promise<LikeStateResponse> {
    await this.caseService.assertExists(caseId);
    const liked = await this.databaseService.caseLikeRepository.toggle(caseId, userId);
    const likeCount = await this.databaseService.caseLikeRepository.countByCaseId(caseId);
    return { likeCount, liked };
  }
}
