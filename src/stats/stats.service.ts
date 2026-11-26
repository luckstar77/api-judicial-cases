import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StatsResponse } from './dtos/stats.dto';

@Injectable()
export class StatsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getStats(): Promise<StatsResponse> {
    const [judgmentCount, caseCount, userCount] = await Promise.all([
      this.databaseService.judgmentRepository.count(),
      this.databaseService.caseRepository.count(),
      this.databaseService.userRepository.count(),
    ]);
    return { judgmentCount, caseCount, userCount };
  }
}
