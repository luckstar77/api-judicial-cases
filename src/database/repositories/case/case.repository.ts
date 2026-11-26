import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Case, CaseComment, CaseLike, User } from '../../entities';
import { CaseListFilterVO, CaseListItemVO, CaseSearchFilterVO, CreateCaseInput } from '../interfaces/case.interface';
import { CreatedVO, PagedVO } from '../interfaces/common.interface';
import { optionalString, RawRow, requiredNumber, requiredString, toDate, toStringArray } from '../row.util';
import { getOffset } from '../../../common/utils/pagination.util';

const LIST_COLUMNS: [string, string][] = [
  ['c.id', 'id'],
  ['c.title', 'title'],
  ['c.content', 'content'],
  ['c.location', 'location'],
  ['c.district', 'district'],
  ['c.rent', 'rent'],
  ['c.defendantName', 'defendantName'],
  ['c.defendantPhone', 'defendantPhone'],
  ['c.defendantIdNo', 'defendantIdNo'],
  ['c.imageUrls', 'imageUrls'],
  ['c.createdAt', 'createdAt'],
  ['c.updatedAt', 'updatedAt'],
  ['u.displayName', 'authorDisplayName'],
];

@Injectable()
export class CaseRepository {
  constructor(@InjectRepository(Case) private readonly repository: Repository<Case>) {}

  async findPage(filter: CaseListFilterVO): Promise<PagedVO<CaseListItemVO>> {
    const baseQuery = this.repository.createQueryBuilder('c');
    if (filter.city) baseQuery.andWhere('c.location = :city', { city: filter.city });
    if (filter.district) baseQuery.andWhere('c.district = :district', { district: filter.district });
    return this.paginate(baseQuery, filter.page, filter.limit);
  }

  async searchPage(filter: CaseSearchFilterVO): Promise<PagedVO<CaseListItemVO>> {
    const baseQuery = this.repository
      .createQueryBuilder('c')
      .where(
        new Brackets((qb) =>
          qb
            .where('c.defendantName IN (:...keywords)', { keywords: filter.keywords })
            .orWhere('c.defendantPhone IN (:...keywords)', { keywords: filter.keywords })
            .orWhere('c.defendantIdNo IN (:...keywords)', { keywords: filter.keywords }),
        ),
      );
    return this.paginate(baseQuery, filter.page, filter.limit);
  }

  async findById(id: number): Promise<CaseListItemVO | undefined> {
    const row = await this.withListColumns(this.repository.createQueryBuilder('c').where('c.id = :id', { id })).getRawOne<RawRow>();
    return row ? this.toListItem(row) : undefined;
  }

  async existsById(id: number): Promise<boolean> {
    const total = await this.repository.createQueryBuilder('c').where('c.id = :id', { id }).getCount();
    return total > 0;
  }

  async create(input: CreateCaseInput): Promise<CreatedVO> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(Case)
      .values({
        plaintiffId: input.plaintiffId,
        title: input.title,
        content: input.content,
        location: input.location,
        district: input.district,
        rent: input.rent,
        defendantName: input.defendantName,
        defendantPhone: input.defendantPhone,
        defendantIdNo: input.defendantIdNo,
        imageUrls: input.imageUrls,
        ip: input.ip,
      })
      .execute();
    return { id: Number(result.identifiers[0]?.id ?? result.raw.insertId) };
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  private async paginate(baseQuery: SelectQueryBuilder<Case>, page: number, limit: number): Promise<PagedVO<CaseListItemVO>> {
    const totalCount = await baseQuery.clone().getCount();
    const rows = await this.withListColumns(baseQuery)
      .orderBy('c.createdAt', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .offset(getOffset(page, limit))
      .limit(limit)
      .getRawMany<RawRow>();
    return { rows: rows.map((row) => this.toListItem(row)), totalCount };
  }

  private withListColumns(query: SelectQueryBuilder<Case>): SelectQueryBuilder<Case> {
    const [first, ...rest] = LIST_COLUMNS;
    const selected = rest.reduce(
      (qb, [path, alias]) => qb.addSelect(path, alias),
      query.leftJoin(User, 'u', 'u.uid = c.plaintiffId').select(first[0], first[1]),
    );
    return selected
      .addSelect((sub) => sub.select('COUNT(*)').from(CaseLike, 'cl').where('cl.caseId = c.id'), 'likeCount')
      .addSelect((sub) => sub.select('COUNT(*)').from(CaseComment, 'cc').where('cc.caseId = c.id'), 'commentCount');
  }

  private toListItem(row: RawRow): CaseListItemVO {
    return {
      id: requiredNumber(row.id),
      title: requiredString(row.title),
      content: requiredString(row.content),
      location: optionalString(row.location),
      district: optionalString(row.district),
      rent: requiredNumber(row.rent),
      defendantName: optionalString(row.defendantName),
      defendantPhone: optionalString(row.defendantPhone),
      defendantIdNo: optionalString(row.defendantIdNo),
      imageUrls: toStringArray(row.imageUrls),
      authorDisplayName: optionalString(row.authorDisplayName),
      likeCount: requiredNumber(row.likeCount),
      commentCount: requiredNumber(row.commentCount),
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt),
    };
  }
}
