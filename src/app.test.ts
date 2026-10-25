import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import request from 'supertest';
import { MemoryCache, MemoryRateLimiter } from '@novachat-enterprise-erp/cache';
import { createLogger, internalAuth } from '@novachat-enterprise-erp/common';
import type { ServiceName } from './config/routes.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';

const secret = 'g'.repeat(32);
const VALID = 'novachat.session_token=good.sig';
const servers: Server[] = [];

const listen = (app: express.Express) =>
  new Promise<string>((resolve) => {
    const server = app.listen(0, () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
    servers.push(server);
  });

const echoUpstream = () => {
  const app = express();
  app.use(internalAuth(secret));
  app.post('/internal/sessions/verify', (req, res) => {
    if (req.headers.cookie?.includes(VALID)) {
      return res.json({
        user: { id: 'u1', name: 'Itoje', email: 'i@x.com', username: 'itoje', image: null, createdAt: '' },
        sessionId: 's1',
        expiresAt: '2030-01-01T00:00:00Z',
      });
    }
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'nope' } });
  });
  app.get('/internal/workspaces/:wid/members/:uid/access', (req, res) => {
    if (req.params.wid === 'w1') {
      return res.json({ workspaceId: 'w1', memberId: 'm1', role: 'admin', permissions: ['channels:manage'], deactivated: false });
    }
    if (req.params.wid === 'w-off') {
      return res.json({ workspaceId: 'w-off', memberId: 'm2', role: 'member', permissions: [], deactivated: true });
    }
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'no' } });
  });
  app.use((req, res) => res.json({ path: req.originalUrl, auth: req.auth }));
  return listen(app);
};

let app: express.Express;

beforeAll(async () => {
  const upstream = await echoUpstream();
  const targets = Object.fromEntries(
    ['auth', 'workspace', 'message', 'realtime', 'file', 'call', 'notification'].map((s) => [s, upstream]),
  ) as Record<ServiceName, string>;
  app = createApp(
    buildContainer({
      logger: createLogger('test', 'silent'),
      internalSecret: secret,
      publicAppUrl: 'http://localhost:3000',
      targets,
      cache: new MemoryCache(),
      rateLimiter: new MemoryRateLimiter(),
      rateLimits: { perMinute: 1000, authPerMinute: 3 },
    }),
  );
});

afterAll(() => servers.forEach((s) => s.close()));

describe('api-gateway', () => {
  it('proxies public auth routes without a session', async () => {
    const res = await request(app).get('/api/auth/get-session');
    expect(res.status).toBe(200);
    expect(res.body.path).toBe('/api/auth/get-session');
    expect(res.body.auth.userId).toBeUndefined();
  });

  it('requires a session for user routes', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
  });

  it('forwards a signed user context', async () => {
    const res = await request(app).get('/api/v1/me').set('cookie', VALID);
    expect(res.status).toBe(200);
    expect(res.body.auth).toMatchObject({ userId: 'u1', service: 'api-gateway' });
  });

  it('strips forged internal headers from clients', async () => {
    const res = await request(app)
      .get('/api/auth/get-session')
      .set('x-internal-context', Buffer.from(JSON.stringify({ userId: 'evil' })).toString('base64url'))
      .set('x-internal-ts', String(Date.now()))
      .set('x-internal-signature', 'forged');
    expect(res.body.auth.userId).toBeUndefined();
  });

  it('adds workspace role and permissions for members', async () => {
    const res = await request(app).get('/api/v1/workspaces/w1/conversations').set('cookie', VALID);
    expect(res.status).toBe(200);
    expect(res.body.auth).toMatchObject({ workspaceId: 'w1', memberId: 'm1', role: 'admin', permissions: ['channels:manage'] });
  });

  it('blocks non-members and deactivated members', async () => {
    expect((await request(app).get('/api/v1/workspaces/w2/conversations').set('cookie', VALID)).status).toBe(403);
    expect((await request(app).get('/api/v1/workspaces/w-off/files').set('cookie', VALID)).status).toBe(403);
  });

  it('returns 404 for unknown routes', async () => {
    expect((await request(app).get('/nope')).status).toBe(404);
  });

  it('rate limits auth mutations per ip', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(app).post('/api/auth/sign-in/social')).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('realtime tickets', () => {
  it('issues tickets only to signed-in users', async () => {
    expect((await request(app).get('/api/v1/realtime/ticket')).status).toBe(401);
    const res = await request(app).get('/api/v1/realtime/ticket').set('cookie', VALID);
    expect(res.status).toBe(200);
    expect(res.body.ticket).toMatch(/^[\w-]+\.[\w-]+$/);
  });
});
