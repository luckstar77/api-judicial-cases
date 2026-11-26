import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  runMigrations?: boolean;
}

const POOL_SIZE = 10;
/** 閒置連線在 MySQL wait_timeout（正式機 8 小時）之前由應用程式自己關掉，避免拿到已被伺服器斷開的連線 */
const POOL_IDLE_TIMEOUT_MS = 60_000;
const POOL_MAX_IDLE = 2;
export const MIGRATIONS_TABLE_NAME = 'typeorm_migrations';

export function buildTypeOrmOptions(config: DatabaseConnectionConfig): DataSourceOptions {
  return {
    type: 'mysql',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    charset: 'utf8mb4_unicode_ci',
    // 資料庫時間一律以 UTC 解讀，不受執行環境時區影響
    timezone: 'Z',
    // DATE 欄位（jdate）直接回傳 YYYY-MM-DD 字串
    dateStrings: ['DATE'],
    supportBigNumbers: true,
    bigNumberStrings: false,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: MIGRATIONS_TABLE_NAME,
    migrationsRun: config.runMigrations ?? false,
    synchronize: false,
    poolSize: POOL_SIZE,
    extra: { enableKeepAlive: true, idleTimeout: POOL_IDLE_TIMEOUT_MS, maxIdle: POOL_MAX_IDLE },
  };
}
