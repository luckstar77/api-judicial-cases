import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CaseListItemVO } from '../database/repositories/interfaces/case.interface';
import { maskHalf } from '../common/utils/mask.util';
import { buildPaginated, Paginated } from '../common/utils/pagination.util';
import { StorageService, UploadableFile } from '../storage/storage.service';
import { CaseListItemResponse, CreateCaseBody, CreatedCaseResponse, ListCasesQuery, SearchCasesQuery } from './dtos/case.dto';

export class CaseNotFoundError extends Error {}

const SEPARATOR_PATTERN = /[\s-]/g;
const LOCAL_MOBILE_PATTERN = /^09\d{8}$/;
const E164_TAIWAN_MOBILE_PATTERN = /^\+8869\d{8}$/;
const TAIWAN_COUNTRY_CODE = '+886';

/** 搜尋關鍵字的等價寫法：去除空白與連字號、身分證大寫、手機 09 / +886 兩種格式 */
export function buildSearchKeywords(keyword: string): string[] {
  const compact = keyword.trim().replace(SEPARATOR_PATTERN, '');
  const variants = new Set([keyword.trim(), compact, compact.toUpperCase()]);
  if (LOCAL_MOBILE_PATTERN.test(compact)) variants.add(`${TAIWAN_COUNTRY_CODE}${compact.slice(1)}`);
  if (E164_TAIWAN_MOBILE_PATTERN.test(compact)) variants.add(`0${compact.slice(TAIWAN_COUNTRY_CODE.length)}`);
  return [...variants].filter((variant) => variant.length > 0);
}

export interface CreateCaseInputData {
  userId: string;
  ip: string;
  body: CreateCaseBody;
  images: UploadableFile[];
}

@Injectable()
export class CaseService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async list(query: ListCasesQuery): Promise<Paginated<CaseListItemResponse>> {
    const { rows, totalCount } = await this.databaseService.caseRepository.findPage({
      page: query.page,
      limit: query.limit,
      city: query.city,
      district: query.district,
    });
    return buildPaginated(rows.map(toCaseResponse), query.page, query.limit, totalCount);
  }

  async search(query: SearchCasesQuery): Promise<Paginated<CaseListItemResponse>> {
    const { rows, totalCount } = await this.databaseService.caseRepository.searchPage({
      page: query.page,
      limit: query.limit,
      keywords: buildSearchKeywords(query.keyword),
    });
    return buildPaginated(rows.map(toCaseResponse), query.page, query.limit, totalCount);
  }

  async getDetail(id: number): Promise<CaseListItemResponse> {
    const item = await this.databaseService.caseRepository.findById(id);
    if (!item) throw new CaseNotFoundError(`case ${id} not found`);
    return toCaseResponse(item);
  }

  async assertExists(id: number): Promise<void> {
    if (!(await this.databaseService.caseRepository.existsById(id))) throw new CaseNotFoundError(`case ${id} not found`);
  }

  async create(input: CreateCaseInputData): Promise<CreatedCaseResponse> {
    const imageUrls = input.images.length > 0 ? await this.storageService.uploadCaseImages(input.images) : [];
    return this.databaseService.caseRepository.create({
      plaintiffId: input.userId,
      title: input.body.title,
      content: input.body.content,
      location: input.body.location,
      district: input.body.district,
      rent: input.body.rent,
      defendantName: input.body.defendantName,
      defendantPhone: input.body.defendantPhone,
      defendantIdNo: input.body.defendantIdNo,
      imageUrls,
      ip: input.ip,
    });
  }

  /** 舊版 GET /case/pages 使用 */
  async countPages(pageSize: number): Promise<number> {
    const count = await this.databaseService.caseRepository.count();
    return Math.ceil(count / pageSize);
  }
}

/** 公開輸出：遮罩對象個資，不含回報者 uid / ip */
export function toCaseResponse(item: CaseListItemVO): CaseListItemResponse {
  return {
    ...item,
    defendantName: maskHalf(item.defendantName),
    defendantPhone: maskHalf(item.defendantPhone),
    defendantIdNo: maskHalf(item.defendantIdNo),
  };
}
