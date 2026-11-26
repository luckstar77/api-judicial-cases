import { Throttle } from '@nestjs/throttler';

const AUTH_THROTTLE_WINDOW_MS = 60_000;
const DEFAULT_AUTH_THROTTLE_LIMIT = 10;

/** 登入 / 註冊 / 簡訊驗證：每 IP 每分鐘上限（預設 10 次，可用 AUTH_THROTTLE_LIMIT 調整） */
export const AuthThrottle = () =>
  Throttle({
    default: {
      ttl: AUTH_THROTTLE_WINDOW_MS,
      limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? DEFAULT_AUTH_THROTTLE_LIMIT),
    },
  });
