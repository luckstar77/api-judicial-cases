import { MigrationInterface, QueryRunner } from 'typeorm';

/** users.ip 原為 char(39)，放不下 IPv4-mapped IPv6（最長 45 字元），與其他表的 ip 欄位對齊 */
export class WidenUserIp1764100000003 implements MigrationInterface {
  name = 'WidenUserIp1764100000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` MODIFY `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `users` MODIFY `ip` char(39) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL');
  }
}
