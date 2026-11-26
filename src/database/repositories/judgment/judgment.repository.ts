import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Judgment, JudgmentComment, JudgmentLike } from '../../entities';
import { PageQueryVO, PagedVO } from '../interfaces/common.interface';
import {
  CityJudgmentCountVO,
  JudgmentDetailVO,
  JudgmentFullTextVO,
  JudgmentListItemVO,
  WarningNameQueryVO,
  WarningNameVO,
} from '../interfaces/judgment.interface';
import { optionalNumber, optionalString, RawRow, requiredNumber, requiredString } from '../row.util';
import { getOffset } from '../../../common/utils/pagination.util';

const LIST_COLUMNS: [string, string][] = [
  ['j.id', 'id'],
  ['j.jyear', 'jyear'],
  ['j.jcase', 'jcase'],
  ['j.jno', 'jno'],
  ['j.jdate', 'jdate'],
  ['j.jtitle', 'jtitle'],
  ['j.plaintiff', 'plaintiff'],
  ['j.defendant', 'defendant'],
  ['j.rent', 'rent'],
  ['j.city', 'city'],
  ['j.district', 'district'],
  ['j.win', 'win'],
];

/** 匿名化的姓名（例：王○明）不列入高風險名單 */
const ANONYMIZED_NAME_PATTERN = '%○%';
/** 沿用舊版規則：LENGTH 以 byte 計，12 bytes 約等於 4 個中文字，用來排除公司行號等長名稱 */
const MAX_WARNING_NAME_BYTES = 12;
/** 舊版 GET /cases?search= 沒有分頁，加上上限避免一次回傳過多全文 */
const MAX_FULL_TEXT_RESULTS = 200;

@Injectable()
export class JudgmentRepository {
  constructor(@InjectRepository(Judgment) private readonly repository: Repository<Judgment>) {}

  /** 原告或被告姓名完全相符（collation 不分大小寫），依判決日期新到舊 */
  async searchByName(keyword: string, page: PageQueryVO): Promise<PagedVO<JudgmentListItemVO>> {
    const baseQuery = this.repository.createQueryBuilder('j').where(this.nameMatches(keyword));
    const totalCount = await baseQuery.clone().getCount();
    const rows = await this.withListColumns(baseQuery)
      .orderBy('j.jdate', 'DESC')
      .addOrderBy('j.id', 'DESC')
      .offset(getOffset(page.page, page.limit))
      .limit(page.limit)
      .getRawMany<RawRow>();
    return { rows: rows.map((row) => this.toListItem(row)), totalCount };
  }

  async findDetailById(id: string): Promise<JudgmentDetailVO | undefined> {
    const row = await this.withListColumns(this.repository.createQueryBuilder('j'))
      .addSelect('j.jfull', 'jfull')
      .addSelect('j.jpdf', 'jpdf')
      .where('j.id = :id', { id })
      .getRawOne<RawRow>();
    if (!row) return undefined;
    return { ...this.toListItem(row), jfull: requiredString(row.jfull), jpdf: optionalString(row.jpdf) };
  }

  async existsById(id: string): Promise<boolean> {
    const total = await this.repository.createQueryBuilder('j').where('j.id = :id', { id }).getCount();
    return total > 0;
  }

  async findFullTextByName(keyword: string): Promise<JudgmentFullTextVO[]> {
    const rows = await this.repository
      .createQueryBuilder('j')
      .select(['j.id', 'j.plaintiff', 'j.defendant', 'j.rent', 'j.city', 'j.win', 'j.jyear', 'j.jfull', 'j.jtitle'])
      .where(this.nameMatches(keyword))
      .orderBy('j.jdate', 'DESC')
      .addOrderBy('j.id', 'DESC')
      .take(MAX_FULL_TEXT_RESULTS)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      plaintiff: row.plaintiff ?? undefined,
      defendant: row.defendant ?? undefined,
      rent: row.rent ?? undefined,
      city: row.city ?? undefined,
      win: row.win ?? undefined,
      jyear: row.jyear ?? undefined,
      jfull: row.jfull,
      jtitle: row.jtitle ?? undefined,
    }));
  }

  /** 依城市與租金區間，統計敗訴方姓名出現次數 */
  async findWarningNames(query: WarningNameQueryVO): Promise<WarningNameVO[]> {
    const rows = await this.repository.manager
      .createQueryBuilder()
      .select('t.name', 'name')
      .addSelect('COUNT(*)', 'judgmentCount')
      .from(
        (subQuery: SelectQueryBuilder<Judgment>) =>
          subQuery
            .select("CASE WHEN j.win != 'plaintiff' THEN j.plaintiff ELSE j.defendant END", 'name')
            .from(Judgment, 'j')
            .where('j.city = :city', { city: query.city })
            .andWhere('j.rent BETWEEN :rentMin AND :rentMax', { rentMin: query.rentMin, rentMax: query.rentMax }),
        't',
      )
      .where('t.name IS NOT NULL')
      .andWhere('t.name NOT LIKE :anonymized', { anonymized: ANONYMIZED_NAME_PATTERN })
      .andWhere('LENGTH(t.name) <= :maxBytes', { maxBytes: MAX_WARNING_NAME_BYTES })
      .groupBy('t.name')
      .having('COUNT(*) >= :minCount', { minCount: query.minCount })
      .orderBy('judgmentCount', 'DESC')
      .addOrderBy('t.name', 'ASC')
      .limit(query.limit)
      .getRawMany<RawRow>();
    return rows.map((row) => ({ name: requiredString(row.name), judgmentCount: requiredNumber(row.judgmentCount) }));
  }

  async countByCity(cities: readonly string[]): Promise<CityJudgmentCountVO[]> {
    const rows = await this.repository
      .createQueryBuilder('j')
      .select('j.city', 'city')
      .addSelect('COUNT(*)', 'judgmentCount')
      .where('j.city IN (:...cities)', { cities })
      .groupBy('j.city')
      .orderBy('judgmentCount', 'DESC')
      .addOrderBy('j.city', 'ASC')
      .getRawMany<RawRow>();
    return rows.map((row) => ({ city: requiredString(row.city), judgmentCount: requiredNumber(row.judgmentCount) }));
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  private nameMatches(keyword: string): Brackets {
    return new Brackets((qb) => qb.where('j.plaintiff = :keyword', { keyword }).orWhere('j.defendant = :keyword', { keyword }));
  }

  private withListColumns(query: SelectQueryBuilder<Judgment>): SelectQueryBuilder<Judgment> {
    const [first, ...rest] = LIST_COLUMNS;
    const selected = rest.reduce((qb, [path, alias]) => qb.addSelect(path, alias), query.select(first[0], first[1]));
    return selected
      .addSelect((sub) => sub.select('COUNT(*)').from(JudgmentLike, 'jl').where('jl.filesetId = j.id'), 'likeCount')
      .addSelect((sub) => sub.select('COUNT(*)').from(JudgmentComment, 'jc').where('jc.filesetId = j.id'), 'commentCount');
  }

  private toListItem(row: RawRow): JudgmentListItemVO {
    return {
      id: requiredString(row.id),
      jyear: optionalString(row.jyear),
      jcase: optionalString(row.jcase),
      jno: optionalString(row.jno),
      jdate: requiredString(row.jdate),
      jtitle: optionalString(row.jtitle),
      plaintiff: optionalString(row.plaintiff),
      defendant: optionalString(row.defendant),
      rent: optionalNumber(row.rent),
      city: optionalString(row.city),
      district: optionalString(row.district),
      win: optionalString(row.win),
      likeCount: requiredNumber(row.likeCount),
      commentCount: requiredNumber(row.commentCount),
    };
  }
}
