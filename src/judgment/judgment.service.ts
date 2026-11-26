import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JudgmentFullTextVO } from '../database/repositories/interfaces/judgment.interface';
import { JUDGMENT_CITIES, toJudgmentCity } from '../common/utils/city.util';
import { buildPaginated, Paginated } from '../common/utils/pagination.util';
import {
  CityStatResponse,
  JudgmentDetailResponse,
  JudgmentListItemResponse,
  SearchJudgmentsQuery,
  WarningNameResponse,
  WarningNamesQuery,
} from './dtos/judgment.dto';

export class JudgmentNotFoundError extends Error {}

const MAX_WARNING_NAMES = 100;

@Injectable()
export class JudgmentService {
  constructor(private readonly databaseService: DatabaseService) {}

  async search(query: SearchJudgmentsQuery): Promise<Paginated<JudgmentListItemResponse>> {
    const { rows, totalCount } = await this.databaseService.judgmentRepository.searchByName(query.keyword, { page: query.page, limit: query.limit });
    return buildPaginated(rows, query.page, query.limit, totalCount);
  }

  async getDetail(id: string): Promise<JudgmentDetailResponse> {
    const detail = await this.databaseService.judgmentRepository.findDetailById(id);
    if (!detail) throw new JudgmentNotFoundError(`judgment ${id} not found`);
    return detail;
  }

  async assertExists(id: string): Promise<void> {
    if (!(await this.databaseService.judgmentRepository.existsById(id))) throw new JudgmentNotFoundError(`judgment ${id} not found`);
  }

  getWarningNames(query: WarningNamesQuery): Promise<WarningNameResponse[]> {
    return this.databaseService.judgmentRepository.findWarningNames({
      city: toJudgmentCity(query.city),
      rentMin: Math.min(query.rentMin, query.rentMax),
      rentMax: Math.max(query.rentMin, query.rentMax),
      minCount: query.minCount,
      limit: MAX_WARNING_NAMES,
    });
  }

  getCityStats(): Promise<CityStatResponse[]> {
    return this.databaseService.judgmentRepository.countByCity(JUDGMENT_CITIES);
  }

  /** 舊版 GET /cases?search= 使用 */
  findFullTextByName(keyword: string): Promise<JudgmentFullTextVO[]> {
    return this.databaseService.judgmentRepository.findFullTextByName(keyword.trim());
  }
}
