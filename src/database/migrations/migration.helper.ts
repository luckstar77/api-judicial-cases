import { QueryRunner } from 'typeorm';

interface CountRow {
  total: number | string;
}

async function countRows(queryRunner: QueryRunner, sql: string, parameters: unknown[]): Promise<number> {
  const rows: CountRow[] = await queryRunner.query(sql, parameters);
  return Number(rows[0]?.total ?? 0);
}

export async function hasPrimaryKey(queryRunner: QueryRunner, table: string): Promise<boolean> {
  const total = await countRows(
    queryRunner,
    `SELECT COUNT(*) AS total FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = ? AND constraint_type = 'PRIMARY KEY'`,
    [table],
  );
  return total > 0;
}

export async function hasIndex(queryRunner: QueryRunner, table: string, indexName: string): Promise<boolean> {
  const total = await countRows(
    queryRunner,
    'SELECT COUNT(*) AS total FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, indexName],
  );
  return total > 0;
}

/** 索引名稱與欄位都是 migration 內的常數，不接受外部輸入 */
export async function createIndexIfMissing(queryRunner: QueryRunner, table: string, indexName: string, columns: string[], isUnique = false): Promise<void> {
  if (await hasIndex(queryRunner, table, indexName)) return;
  const columnList = columns.map((column) => `\`${column}\``).join(', ');
  await queryRunner.query(`CREATE ${isUnique ? 'UNIQUE ' : ''}INDEX \`${indexName}\` ON \`${table}\` (${columnList})`);
}

export async function dropIndexIfExists(queryRunner: QueryRunner, table: string, indexName: string): Promise<void> {
  if (!(await hasIndex(queryRunner, table, indexName))) return;
  await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${table}\``);
}
