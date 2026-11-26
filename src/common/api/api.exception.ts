import { ErrorCodes } from './error-codes';

/** Controller 把 service 的自訂錯誤轉成 ApiException，由 AllExceptionsFilter 統一輸出 */
export class ApiException extends Error {
  constructor(
    readonly code: ErrorCodes,
    message: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
