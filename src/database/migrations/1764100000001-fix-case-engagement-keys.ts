import { MigrationInterface, QueryRunner } from 'typeorm';
import { createIndexIfMissing, dropIndexIfExists, hasPrimaryKey } from './migration.helper';

const CASE_COMMENTS = 'caseComments';
const CASE_LIKES = 'caseLikes';
const CASE_COMMENTS_CASE_INDEX = 'idx_caseComments_caseId';
const CASE_LIKES_UNIQUE_INDEX = 'uq_caseLikes_caseId_userId';

/**
 * caseComments / caseLikes 的 id 是 NOT NULL 但沒有 AUTO_INCREMENT 與主鍵，
 * 在 STRICT_TRANS_TABLES 下每次新增都會失敗（案例留言、按讚功能因此無法使用）。
 * 補上主鍵、AUTO_INCREMENT、留言時間預設值，以及「一人一案只能按讚一次」的唯一索引。
 */
export class FixCaseEngagementKeys1764100000001 implements MigrationInterface {
  name = 'FixCaseEngagementKeys1764100000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addAutoIncrementPrimaryKey(queryRunner, CASE_COMMENTS);
    await queryRunner.query(`ALTER TABLE \`${CASE_COMMENTS}\` MODIFY \`createdAt\` datetime NULL DEFAULT CURRENT_TIMESTAMP`);
    await createIndexIfMissing(queryRunner, CASE_COMMENTS, CASE_COMMENTS_CASE_INDEX, ['caseId', 'createdAt']);

    await this.addAutoIncrementPrimaryKey(queryRunner, CASE_LIKES);
    // 加唯一索引前先移除重複按讚（保留最早一筆）
    await queryRunner.query(
      `DELETE later FROM \`${CASE_LIKES}\` later JOIN \`${CASE_LIKES}\` earlier
       ON later.caseId = earlier.caseId AND later.userId = earlier.userId AND later.id > earlier.id`,
    );
    await createIndexIfMissing(queryRunner, CASE_LIKES, CASE_LIKES_UNIQUE_INDEX, ['caseId', 'userId'], true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await dropIndexIfExists(queryRunner, CASE_LIKES, CASE_LIKES_UNIQUE_INDEX);
    await dropIndexIfExists(queryRunner, CASE_COMMENTS, CASE_COMMENTS_CASE_INDEX);
    for (const table of [CASE_COMMENTS, CASE_LIKES]) {
      await queryRunner.query(`ALTER TABLE \`${table}\` MODIFY \`id\` bigint NOT NULL`);
      await queryRunner.query(`ALTER TABLE \`${table}\` DROP PRIMARY KEY`);
    }
    await queryRunner.query(`ALTER TABLE \`${CASE_COMMENTS}\` MODIFY \`createdAt\` datetime DEFAULT NULL`);
  }

  private async addAutoIncrementPrimaryKey(queryRunner: QueryRunner, table: string): Promise<void> {
    if (await hasPrimaryKey(queryRunner, table)) return;
    // 既有資料的 id 可能是 0 或重複，先重新編號才能建立主鍵
    await queryRunner.query('SET @row_number = 0');
    await queryRunner.query(`UPDATE \`${table}\` SET \`id\` = (@row_number := @row_number + 1) ORDER BY \`id\``);
    await queryRunner.query(`ALTER TABLE \`${table}\` MODIFY \`id\` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY`);
  }
}
