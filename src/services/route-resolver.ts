import type { AccessLevel, RouteRule, ServiceName } from '../config/routes.js';

export interface ResolvedRoute {
  service: ServiceName;
  target: string;
  access: AccessLevel;
  workspaceId?: string;
}

export class RouteResolver {
  constructor(
    private readonly rules: RouteRule[],
    private readonly targets: Record<ServiceName, string>,
  ) {}

  resolve(path: string): ResolvedRoute | null {
    for (const rule of this.rules) {
      const match = rule.pattern.exec(path);
      if (!match) continue;
      return {
        service: rule.service,
        target: this.targets[rule.service],
        access: rule.access,
        workspaceId: match.groups?.workspaceId,
      };
    }
    return null;
  }
}
