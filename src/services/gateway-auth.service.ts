import type { AuthContext } from '@novachat-enterprise-erp/contracts';
import { ForbiddenError, UnauthorizedError } from '@novachat-enterprise-erp/common';
import type { ResolvedRoute } from './route-resolver.js';
import type { SessionResolverService } from './session-resolver.service.js';
import type { WorkspaceAccessService } from './workspace-access.service.js';
import type { RealtimeTicketService } from './realtime-ticket.service.js';

export class GatewayAuthService {
  constructor(
    private readonly sessions: SessionResolverService,
    private readonly access: WorkspaceAccessService,
    private readonly tickets: RealtimeTicketService,
  ) {}

  async authenticateSocket(route: ResolvedRoute, cookieHeader: string | undefined, ticket: string | null): Promise<AuthContext> {
    const claims = this.tickets.verify(ticket);
    if (claims) return { service: 'api-gateway', permissions: [], userId: claims.userId, email: claims.email, name: claims.name };
    return this.authenticate(route, cookieHeader);
  }

  async authenticate(route: ResolvedRoute, cookieHeader: string | undefined, requestId?: string): Promise<AuthContext> {
    const base: AuthContext = { service: 'api-gateway', permissions: [] };
    if (route.access === 'public') return base;

    const session = await this.sessions.resolve(cookieHeader, requestId);
    if (!session) {
      if (route.access === 'optional') return base;
      throw new UnauthorizedError();
    }

    const context: AuthContext = {
      ...base,
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    if (route.access !== 'member' || !route.workspaceId) return context;

    const membership = await this.access.resolve(route.workspaceId, session.user.id, requestId);
    if (!membership) throw new ForbiddenError('You are not a member of this workspace');
    if (membership.deactivated) throw new ForbiddenError('Your account has been deactivated in this workspace');

    return {
      ...context,
      workspaceId: membership.workspaceId,
      memberId: membership.memberId,
      role: membership.role,
      permissions: membership.permissions,
    };
  }
}
