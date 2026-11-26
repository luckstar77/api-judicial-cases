import { MigrationInterface, QueryRunner } from 'typeorm';

interface CountRow {
  total: number | string;
}

/** users.tokenVersion：改密碼時 +1，讓之前簽發的 token 全部失效（舊程式不讀這個欄位，可直接回退） */
export class AddUserTokenVersion1764100000004 implements MigrationInterface {
  name = 'AddUserTokenVersion1764100000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasColumn(queryRunner)) return;
    await queryRunner.query('ALTER TABLE `users` ADD COLUMN `tokenVersion` int NOT NULL DEFAULT 0');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner))) return;
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `tokenVersion`');
  }

  private async hasColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows: CountRow[] = await queryRunner.query(
      "SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'tokenVersion'",
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }
}
