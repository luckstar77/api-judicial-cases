import { createHash, randomBytes, scrypt, ScryptOptions, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const HASH_SEPARATOR = '$';
/** 舊版密碼：未加鹽的 SHA-256 hex */
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface PasswordVerifyResult {
  isValid: boolean;
  /** 舊格式密碼驗證成功後需要改存成 scrypt */
  needsRehash: boolean;
}

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** 產生 `scrypt$N$r$p$salt$hash`（base64）格式的雜湊 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION });
  return [SCRYPT_PREFIX, SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELIZATION, salt.toString('base64'), key.toString('base64')].join(HASH_SEPARATOR);
}

export async function verifyPassword(password: string, storedHash?: string): Promise<PasswordVerifyResult> {
  if (!storedHash) return { isValid: false, needsRehash: false };

  if (LEGACY_SHA256_PATTERN.test(storedHash)) {
    const legacyHash = createHash('sha256').update(password).digest('hex');
    return { isValid: safeEqual(Buffer.from(legacyHash), Buffer.from(storedHash)), needsRehash: true };
  }

  const [prefix, cost, blockSize, parallelization, saltBase64, keyBase64] = storedHash.split(HASH_SEPARATOR);
  if (prefix !== SCRYPT_PREFIX || !saltBase64 || !keyBase64) return { isValid: false, needsRehash: false };

  const expectedKey = Buffer.from(keyBase64, 'base64');
  const actualKey = await deriveKey(password, Buffer.from(saltBase64, 'base64'), {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });
  return { isValid: safeEqual(actualKey, expectedKey), needsRehash: false };
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
