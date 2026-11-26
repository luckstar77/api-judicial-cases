import { DataSource } from 'typeorm';
import { ENTITIES } from '../entities';

/** 清空所有實體資料表（MySQL 需在同一個連線上關閉外鍵檢查） */
export async function clearAllDataInDB(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const entity of ENTITIES) {
      const { tableName } = dataSource.getMetadata(entity);
      await queryRunner.query(`TRUNCATE TABLE \`${tableName}\``);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await queryRunner.release();
  }
}
