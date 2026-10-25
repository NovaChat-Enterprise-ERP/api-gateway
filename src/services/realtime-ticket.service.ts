import { createHmac, timingSafeEqual } from 'node:crypto';

export interface RealtimeTicketClaims {
  userId: string;
  email?: string;
  name?: string;
  exp: number;
}

export class RealtimeTicketService {
  private readonly key: Buffer;

  constructor(
    secret: string,
    private readonly ttlSeconds = 300,
  ) {
    this.key = createHmac('sha256', secret).update('realtime-ticket').digest();
  }

  issue(claims: Omit<RealtimeTicketClaims, 'exp'>, now = Date.now()): { ticket: string; expiresAt: string } {
    const exp = now + this.ttlSeconds * 1000;
    const payload = Buffer.from(JSON.stringify({ ...claims, exp })).toString('base64url');
    return { ticket: `${payload}.${this.sign(payload)}`, expiresAt: new Date(exp).toISOString() };
  }

  verify(ticket: string | null | undefined, now = Date.now()): RealtimeTicketClaims | null {
    if (!ticket) return null;
    const [payload, signature] = ticket.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(this.sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as RealtimeTicketClaims;
      return claims.exp > now && typeof claims.userId === 'string' ? claims : null;
    } catch {
      return null;
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.key).update(payload).digest('base64url');
  }
}
