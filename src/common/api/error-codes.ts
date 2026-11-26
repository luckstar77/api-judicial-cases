/** 回應代碼，規則見 docs/api-v1.md */
export enum ErrorCodes {
  SUCCESS = 20000,
  NOT_FOUND = 20400,
  VALIDATION_ERROR = 40000,
  UNAUTHORIZED = 40100,
  INVALID_CREDENTIALS = 40101,
  INVALID_FIREBASE_TOKEN = 40102,
  ROUTE_NOT_FOUND = 40400,
  CONFLICT = 40900,
  TOO_MANY_REQUESTS = 42900,
  INTERNAL_ERROR = 50000,
}

/** v1 API：業務錯誤一律 HTTP 200，只有驗證、限流與伺服器錯誤使用對應的 HTTP status */
export const V1_HTTP_STATUS: Partial<Record<ErrorCodes, number>> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.ROUTE_NOT_FOUND]: 404,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

/** 舊版路徑沿用 REST 風格的 HTTP status，讓舊前端行為不變 */
export const LEGACY_HTTP_STATUS: Record<ErrorCodes, number> = {
  [ErrorCodes.SUCCESS]: 200,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.INVALID_FIREBASE_TOKEN]: 401,
  [ErrorCodes.ROUTE_NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

export const FIRST_ERROR_CODE = 40000;
