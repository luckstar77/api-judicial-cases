import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ApiException } from '../api/api.exception';
import { ErrorCodes } from '../api/error-codes';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface CapturedResponse {
  status: number;
  body: unknown;
}

interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<void, [unknown]>;
}

function run(exception: unknown, path: string): CapturedResponse {
  const captured: CapturedResponse = { status: 0, body: undefined };
  const response: MockResponse = {
    status: jest.fn((status: number): MockResponse => {
      captured.status = status;
      return response;
    }),
    json: jest.fn((body: unknown) => {
      captured.body = body;
    }),
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ path, method: 'GET' }), getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return captured;
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  describe('/v1 paths', () => {
    it('should return HTTP 200 with the business code for ApiException', () => {
      expect(run(new ApiException(ErrorCodes.NOT_FOUND, 'missing'), '/v1/cases/detail')).toEqual({
        status: 200,
        body: { status: 'ok', code: ErrorCodes.NOT_FOUND, error: { message: 'missing' } },
      });
    });

    it('should return HTTP 401 for unauthorized', () => {
      expect(run(new ApiException(ErrorCodes.UNAUTHORIZED, 'login required'), '/v1/users/me').status).toBe(401);
      expect(run(new UnauthorizedException(), '/v1/users/me')).toMatchObject({ status: 401, body: { code: ErrorCodes.UNAUTHORIZED } });
    });

    it('should join validation messages', () => {
      expect(run(new BadRequestException(['a must be string', 'b must be int']), '/v1/cases')).toEqual({
        status: 200,
        body: { status: 'error', code: ErrorCodes.VALIDATION_ERROR, error: { message: 'a must be string; b must be int' } },
      });
    });

    it('should treat oversized uploads as validation errors', () => {
      expect(run(new PayloadTooLargeException('File too large'), '/v1/cases')).toMatchObject({ status: 200, body: { code: ErrorCodes.VALIDATION_ERROR } });
    });

    it('should return HTTP 404 with code 40400 for unknown routes', () => {
      expect(run(new NotFoundException('Cannot GET /v1/nope'), '/v1/nope')).toMatchObject({ status: 404, body: { code: ErrorCodes.ROUTE_NOT_FOUND } });
    });

    it('should return HTTP 429 when throttled', () => {
      expect(run(new ThrottlerException(), '/v1/auth/login')).toMatchObject({ status: 429, body: { code: ErrorCodes.TOO_MANY_REQUESTS } });
    });

    it('should hide internal error details', () => {
      const result = run(new Error('ER_ACCESS_DENIED password=secret'), '/v1/stats');

      expect(result).toEqual({ status: 500, body: { status: 'error', code: ErrorCodes.INTERNAL_ERROR, error: { message: 'Internal Server Error' } } });
      expect(JSON.stringify(result.body)).not.toContain('secret');
    });

    it('should hide details of HttpException >= 500 and report code 50000 as HTTP 500', () => {
      expect(run(new HttpException('upstream exploded', HttpStatus.BAD_GATEWAY), '/v1/stats')).toEqual({
        status: 500,
        body: { status: 'error', code: ErrorCodes.INTERNAL_ERROR, error: { message: 'Internal Server Error' } },
      });
    });
  });

  describe('legacy paths', () => {
    it('should use REST status codes and { message } body', () => {
      expect(run(new ApiException(ErrorCodes.NOT_FOUND, 'case 1 not found'), '/case/1')).toEqual({ status: 404, body: { message: 'case 1 not found' } });
      expect(run(new ApiException(ErrorCodes.INVALID_CREDENTIALS, 'invalid'), '/user/login')).toEqual({ status: 401, body: { message: 'invalid' } });
      expect(run(new ApiException(ErrorCodes.CONFLICT, 'phone already registered'), '/user/register').status).toBe(409);
      expect(run(new BadRequestException('bad'), '/name')).toEqual({ status: 400, body: { message: 'bad' } });
    });

    it('should keep the original HTTP status of server errors', () => {
      expect(run(new HttpException('upstream exploded', HttpStatus.BAD_GATEWAY), '/case')).toEqual({ status: 502, body: { message: 'Internal Server Error' } });
    });

    it('should not treat /v1x as a versioned path', () => {
      expect(run(new ApiException(ErrorCodes.NOT_FOUND, 'x'), '/v1x').status).toBe(404);
    });
  });
});
