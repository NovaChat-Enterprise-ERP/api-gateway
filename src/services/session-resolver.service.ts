import type { SessionVerifyResult } from '@novachat-enterprise-erp/contracts';
import { AppError, sha256, type InternalHttpClient } from '@novachat-enterprise-erp/common';
import type { KeyValueCache } from '@novachat-enterprise-erp/cache';

const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?novachat\.session_token=([^;]+)/;
const TTL_SECONDS = 60;

export class SessionResolverService {
  constructor(
    private readonly cache: KeyValueCache,
    private readonly authClient: InternalHttpClient,
  ) {}

  static tokenFrom(cookieHeader: string | undefined): string | null {
    return cookieHeader ? (SESSION_COOKIE.exec(cookieHeader)?.[1] ?? null) : null;
  }

  async resolve(cookieHeader: string | undefined, requestId?: string): Promise<SessionVerifyResult | null> {
    const token = SessionResolverService.tokenFrom(cookieHeader);
    if (!token || !cookieHeader) return null;

    const key = this.key(token);
    const cached = await this.cache.get<SessionVerifyResult>(key);
    if (cached) return cached;

    try {
      const result = await this.authClient.request<SessionVerifyResult>('/internal/sessions/verify', {
        method: 'POST',
        headers: { cookie: cookieHeader },
        requestId,
      });
      if (result) await this.cache.set(key, result, TTL_SECONDS);
      return result;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) return null;
      throw error;
    }
  }

  async invalidate(cookieHeader: string | undefined): Promise<void> {
    const token = SessionResolverService.tokenFrom(cookieHeader);
    if (token) await this.cache.del(this.key(token));
  }

  private key(token: string): string {
    return `session:${sha256(decodeURIComponent(token))}`;
  }
}
