import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ApiException } from '../api/api.exception';
import { ErrorCodes, LEGACY_HTTP_STATUS, V1_HTTP_STATUS } from '../api/error-codes';
import { failure } from '../api/response';

const V1_PATH_PREFIX = '/v1/';
const DEFAULT_HTTP_STATUS = 200;
const INTERNAL_ERROR_MESSAGE = 'Internal Server Error';

interface NormalizedError {
  code: ErrorCodes;
  message: string;
  /** 非 ApiException 時保留原始 HTTP status（例如 413、404） */
  httpStatus?: number;
}

/**
 * 統一錯誤輸出：
 * - /v1/* 使用標準格式 { status, code, error: { message } }
 * - 舊版路徑維持 { message } 與 REST 風格的 HTTP status
 * 未預期錯誤只記錄在 log，不把細節回傳給使用者。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const error = this.normalize(exception, request);

    if (request.path.startsWith(V1_PATH_PREFIX) || request.path === V1_PATH_PREFIX.slice(0, -1)) {
      const status =
        V1_HTTP_STATUS[error.code] ?? (error.httpStatus && error.httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR ? error.httpStatus : DEFAULT_HTTP_STATUS);
      response.status(status).json(failure(error.code, error.message));
      return;
    }

    response.status(error.httpStatus ?? LEGACY_HTTP_STATUS[error.code]).json({ message: error.message });
  }

  private normalize(exception: unknown, request: Request): NormalizedError {
    if (exception instanceof ApiException) {
      return { code: exception.code, message: exception.message };
    }
    if (exception instanceof ThrottlerException) {
      return { code: ErrorCodes.TOO_MANY_REQUESTS, message: 'too many requests', httpStatus: HttpStatus.TOO_MANY_REQUESTS };
    }
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`Unhandled error on ${request.method} ${request.path}`, stack);
    return { code: ErrorCodes.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE, httpStatus: HttpStatus.INTERNAL_SERVER_ERROR };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const message = this.extractMessage(exception);
    if (status === HttpStatus.NOT_FOUND) return { code: ErrorCodes.ROUTE_NOT_FOUND, message, httpStatus: status };
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) return { code: ErrorCodes.UNAUTHORIZED, message, httpStatus: status };
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`HttpException ${status}`, exception.stack);
      return { code: ErrorCodes.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE, httpStatus: status };
    }
    // 400 驗證錯誤、413 檔案過大、415 檔案格式等皆屬使用者輸入錯誤
    return { code: ErrorCodes.VALIDATION_ERROR, message, httpStatus: status };
  }

  private extractMessage(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const { message } = body as { message: unknown };
      if (Array.isArray(message)) return message.map(String).join('; ');
      if (typeof message === 'string') return message;
    }
    return exception.message;
  }
}
