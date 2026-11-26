import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

export const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;
export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

const DEFAULT_PORT = 3010;
const DEFAULT_DB_PORT = 3306;
const MAX_PORT = 65535;
/** 每個 IP 每分鐘；同一個電信 NAT 後面可能有很多使用者，不宜太低 */
const DEFAULT_THROTTLE_LIMIT = 300;
const DEFAULT_AUTH_THROTTLE_LIMIT = 10;

/** 所有環境變數集中在這裡驗證；缺少必要設定時應用程式直接啟動失敗 */
export class EnvironmentVariables {
  @IsIn(NODE_ENVIRONMENTS)
  NODE_ENV: NodeEnvironment = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  PORT: number = DEFAULT_PORT;

  /** 只綁本機，對外一律經過 nginx */
  @IsString()
  HOST = '127.0.0.1';

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsString()
  DB_HOST = '127.0.0.1';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  DB_PORT: number = DEFAULT_DB_PORT;

  @IsString()
  DB_USER = 'root';

  @IsString()
  DB_PASSWORD = '';

  @IsString()
  @IsNotEmpty()
  DB_NAME = 'rental';

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN = '30d';

  @IsString()
  @IsNotEmpty()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION = 'ap-northeast-1';

  @IsString()
  @IsNotEmpty()
  S3_BUCKET_NAME: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = DEFAULT_THROTTLE_LIMIT;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT: number = DEFAULT_AUTH_THROTTLE_LIMIT;

  @IsOptional()
  @IsString()
  APP_VERSION?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const definedEntries = Object.entries(config).filter(([key, value]) => value !== '' || key === 'DB_PASSWORD');
  const validated = plainToInstance(EnvironmentVariables, Object.fromEntries(definedEntries), { enableImplicitConversion: false });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.map((error) => Object.values(error.constraints ?? {}).join(', ')).join('; ');
    throw new Error(`Invalid environment variables: ${messages}`);
  }
  return validated;
}
