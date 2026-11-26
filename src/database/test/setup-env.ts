import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

/** E2E 測試在 import 任何模組前載入 .env.test（override 避免沿用開發者本機的環境變數） */
loadEnv({ path: resolve(__dirname, '../../../.env.test'), override: true });
