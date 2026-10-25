import type { Request, Response } from 'express';
import { UnauthorizedError } from '@novachat-enterprise-erp/common';
import type { SessionResolverService } from '../services/session-resolver.service.js';
import type { RealtimeTicketService } from '../services/realtime-ticket.service.js';

export class RealtimeController {
  constructor(
    private readonly sessions: SessionResolverService,
    private readonly tickets: RealtimeTicketService,
  ) {}

  ticket = async (req: Request, res: Response) => {
    const session = await this.sessions.resolve(req.headers.cookie, req.requestId);
    if (!session) throw new UnauthorizedError();
    res.setHeader('Cache-Control', 'no-store');
    res.json(this.tickets.issue({ userId: session.user.id, email: session.user.email, name: session.user.name }));
  };
}
