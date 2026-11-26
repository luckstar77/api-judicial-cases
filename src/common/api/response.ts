import { ErrorCodes, FIRST_ERROR_CODE } from './error-codes';

export interface ApiSuccessResponse<T> {
  status: 'ok';
  code: ErrorCodes;
  data?: T;
}

export interface ApiErrorResponse {
  status: 'ok' | 'error';
  code: ErrorCodes;
  error: { message: string };
}

export function success<T>(data?: T): ApiSuccessResponse<T> {
  if (data === undefined) {
    return { status: 'ok', code: ErrorCodes.SUCCESS };
  }
  return { status: 'ok', code: ErrorCodes.SUCCESS, data };
}

export function failure(code: ErrorCodes, message: string): ApiErrorResponse {
  return { status: code < FIRST_ERROR_CODE ? 'ok' : 'error', code, error: { message } };
}
