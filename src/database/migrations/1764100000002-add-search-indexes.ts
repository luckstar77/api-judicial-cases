import { MigrationInterface, QueryRunner } from 'typeorm';
import { createIndexIfMissing, dropIndexIfExists } from './migration.helper';

interface IndexDefinition {
  table: string;
  name: string;
  columns: string[];
}

/** 判決姓名搜尋、高風險名單、案例列表與對象搜尋原本都是全表掃描 */
const SEARCH_INDEXES: IndexDefinition[] = [
  { table: 'judicialFileset', name: 'idx_judicialFileset_plaintiff', columns: ['plaintiff'] },
  { table: 'judicialFileset', name: 'idx_judicialFileset_defendant', columns: ['defendant'] },
  { table: 'judicialFileset', name: 'idx_judicialFileset_city_rent', columns: ['city', 'rent'] },
  { table: 'judicialFileset', name: 'idx_judicialFileset_jdate', columns: ['jdate'] },
  { table: 'cases', name: 'idx_cases_createdAt', columns: ['createdAt'] },
  { table: 'cases', name: 'idx_cases_location_district', columns: ['location', 'district'] },
  { table: 'cases', name: 'idx_cases_defendantName', columns: ['defendantName'] },
  { table: 'cases', name: 'idx_cases_defendantPhone', columns: ['defendantPhone'] },
  { table: 'cases', name: 'idx_cases_defendantIdNo', columns: ['defendantIdNo'] },
  { table: 'users', name: 'idx_users_phone', columns: ['phone'] },
];

export class AddSearchIndexes1764100000002 implements MigrationInterface {
  name = 'AddSearchIndexes1764100000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const index of SEARCH_INDEXES) {
      await createIndexIfMissing(queryRunner, index.table, index.name, index.columns);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of SEARCH_INDEXES) {
      await dropIndexIfExists(queryRunner, index.table, index.name);
    }
  }
}
