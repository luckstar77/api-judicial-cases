import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

/** TypeORM CLI 使用（npm run migration:run），讀取專案根目錄的 .env */
loadEnv();

const DEFAULT_DB_PORT = 3306;

export default new DataSource(
  buildTypeOrmOptions({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? DEFAULT_DB_PORT),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'rental',
  }),
);
