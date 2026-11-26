import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 正式環境既有 schema（2026-11 由 mysqldump --no-data 取得）。
 * 一律使用 CREATE TABLE IF NOT EXISTS：在正式機是 no-op，在 CI / 本機測試資料庫則建立相同結構。
 * caseComments / caseLikes 原本沒有主鍵與 AUTO_INCREMENT，交由下一支 migration 修正。
 */
export class BaselineSchema1764100000000 implements MigrationInterface {
  name = 'BaselineSchema1764100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`uid\` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`phone\` char(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`ip\` char(39) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`name\` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`email\` char(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`password\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`displayName\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        PRIMARY KEY (\`uid\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`judicialDataset\` (
        \`id\` int unsigned NOT NULL,
        \`title\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`categoryName\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`filesets\` json NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`judicialFileset\` (
        \`id\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`jcase\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`jdate\` date NOT NULL,
        \`jfull\` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
        \`jno\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`jpdf\` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`jtitle\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`jyear\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`plaintiff\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`defendant\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`rent\` int DEFAULT NULL,
        \`city\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`district\` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`win\` enum('plaintiff','defendant') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`comments\` (
        \`id\` int unsigned NOT NULL AUTO_INCREMENT,
        \`userId\` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`filesetId\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`content\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`ip\` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`comments_judicialFileset_FK\` (\`filesetId\`),
        KEY \`comments_users_FK\` (\`userId\`),
        CONSTRAINT \`comments_judicialFileset_FK\` FOREIGN KEY (\`filesetId\`) REFERENCES \`judicialFileset\` (\`id\`),
        CONSTRAINT \`comments_users_FK\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`uid\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`likes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`filesetId\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`unique_user_case\` (\`userId\`,\`filesetId\`),
        KEY \`filesetId\` (\`filesetId\`),
        CONSTRAINT \`likes_ibfk_1\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`uid\`),
        CONSTRAINT \`likes_ibfk_2\` FOREIGN KEY (\`filesetId\`) REFERENCES \`judicialFileset\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cases\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`plaintiffId\` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`title\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`content\` text COLLATE utf8mb4_unicode_ci NOT NULL,
        \`location\` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`district\` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`rent\` int NOT NULL,
        \`defendantName\` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`defendantPhone\` char(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`defendantIdNo\` char(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`imageUrls\` json DEFAULT NULL,
        \`ip\` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`caseComments\` (
        \`id\` bigint NOT NULL,
        \`caseId\` bigint NOT NULL,
        \`userId\` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`content\` text COLLATE utf8mb4_unicode_ci NOT NULL,
        \`ip\` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`createdAt\` datetime DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`caseLikes\` (
        \`id\` bigint NOT NULL,
        \`caseId\` bigint NOT NULL,
        \`userId\` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  /** baseline 不提供 down：絕不刪除正式資料表 */
  async down(): Promise<void> {
    return;
  }
}
