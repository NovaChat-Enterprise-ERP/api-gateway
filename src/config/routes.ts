export type ServiceName =
  | 'auth'
  | 'workspace'
  | 'message'
  | 'realtime'
  | 'file'
  | 'call'
  | 'notification';

export type AccessLevel = 'public' | 'optional' | 'user' | 'member';

export interface RouteRule {
  pattern: RegExp;
  service: ServiceName;
  access: AccessLevel;
}

const WS = String.raw`^/api/v1/workspaces/(?<workspaceId>[^/]+)`;

export const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/api\/auth(\/|$)/, service: 'auth', access: 'public' },
  { pattern: /^\/api\/v1\/(me|users)(\/|$)/, service: 'auth', access: 'user' },
  { pattern: /^\/api\/v1\/invites\/[^/]+(\/|$)/, service: 'workspace', access: 'optional' },
  { pattern: /^\/api\/v1\/avatars(\/|$)/, service: 'file', access: 'optional' },
  { pattern: /^\/api\/v1\/workspaces\/?$/, service: 'workspace', access: 'user' },
  { pattern: /^\/api\/v1\/workspaces\/by-slug\/[^/]+\/?$/, service: 'workspace', access: 'user' },
  { pattern: new RegExp(`${WS}/?$`), service: 'workspace', access: 'member' },
  {
    pattern: new RegExp(`${WS}/(settings|members|roles|invites|audit-logs|me|leave|transfer-ownership)(/|$)`),
    service: 'workspace',
    access: 'member',
  },
  { pattern: new RegExp(`${WS}/(conversations|messages|threads|search)(/|$)`), service: 'message', access: 'member' },
  { pattern: new RegExp(`${WS}/(files|folders)(/|$)`), service: 'file', access: 'member' },
  { pattern: new RegExp(`${WS}/meetings(/|$)`), service: 'call', access: 'member' },
  { pattern: new RegExp(`${WS}/notifications(/|$)`), service: 'notification', access: 'member' },
  { pattern: /^\/socket\.io(\/|$)/, service: 'realtime', access: 'user' },
  { pattern: /^\/webhooks\/livekit\/?$/, service: 'call', access: 'public' },
];
