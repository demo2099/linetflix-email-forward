/**
 * 密码验证工具
 */

import crypto from 'crypto';

/**
 * 使用 SHA-256 对密码进行哈希
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 从环境变量读取多密码配置：
 * 1) ADMIN_PASSWORDS: 逗号/换行分隔（推荐）
 * 2) ADMIN_PASSWORD: 单密码（兼容旧版本）
 */
function getConfiguredPasswords(): string[] {
  const multiple = process.env.ADMIN_PASSWORDS;
  if (multiple && multiple.trim().length > 0) {
    return multiple
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const single = process.env.ADMIN_PASSWORD;
  if (single && single.trim().length > 0) {
    return [single.trim()];
  }

  return [];
}

function getConfiguredPasswordHashes(): string[] {
  return getConfiguredPasswords().map(hashPassword);
}

function getSessionTtlSeconds(): number {
  const ttl = parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10);
  if (Number.isNaN(ttl) || ttl <= 0) {
    return 86400;
  }
  return ttl;
}

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET || process.env.AUTH_SECRET || process.env.WEBHOOK_API_KEY;
  if (envSecret && envSecret.trim().length > 0) {
    return envSecret;
  }

  // 兜底：无显式密钥时仍可工作，但重启后会失效，不建议生产使用
  return hashPassword(`fallback-secret:${process.cwd()}`);
}

function signPayload(payloadBase64Url: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadBase64Url)
    .digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice('Bearer '.length).trim() || null;
}

/**
 * 验证密码，返回匹配密码的哈希；不匹配返回 null
 */
export function authenticatePassword(password: string): string | null {
  const configuredHashes = getConfiguredPasswordHashes();
  if (configuredHashes.length === 0) {
    console.error('No password configured in environment (ADMIN_PASSWORDS or ADMIN_PASSWORD)');
    return null;
  }

  const inputHash = hashPassword(password);
  const matched = configuredHashes.find((hash) => safeEqual(hash, inputHash));
  return matched || null;
}

/**
 * 兼容旧调用
 */
export function validatePassword(password: string): boolean {
  return !!authenticatePassword(password);
}

/**
 * 生成会话令牌（包含密码哈希指纹）
 */
export function generateSessionToken(passwordHash: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    pwd: passwordHash,
    iat: now,
    exp: now + getSessionTtlSeconds(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const payloadBase64Url = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

/**
 * 验证会话令牌
 */
export function validateSessionToken(token: string): boolean {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadBase64Url, signature] = parts;
  const expectedSignature = signPayload(payloadBase64Url);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payloadRaw = Buffer.from(payloadBase64Url, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadRaw) as {
      pwd?: string;
      exp?: number;
    };

    if (!payload.pwd || !payload.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return false;
    }

    // 核心逻辑：会话绑定到具体密码哈希。
    // 当管理员移除某个密码后，该密码签发的会话将立即失效。
    const configuredHashes = getConfiguredPasswordHashes();
    return configuredHashes.some((hash) => safeEqual(hash, payload.pwd!));
  } catch {
    return false;
  }
}
