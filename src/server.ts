import { createRedisClient, RedisCache, RedisRateLimiter } from '@novachat-enterprise-erp/cache';
import { createLogger, startServer } from '@novachat-enterprise-erp/common';
import { RedisStreamEventSubscriber } from '@novachat-enterprise-erp/events';
import { loadGatewayEnv } from './config/env.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';
import { createUpgradeHandler } from './proxy/websocket-upgrade.js';
import { registerCacheInvalidation } from './events/cache-invalidation.js';

const env = loadGatewayEnv();
const logger = createLogger('api-gateway', env.LOG_LEVEL);
const redis = createRedisClient(env.REDIS_URL, (err) => logger.warn({ err: err.message }, 'Redis connection error; reconnecting'));

const container = buildContainer({
  logger,
  internalSecret: env.INTERNAL_SECRET,
  publicAppUrl: env.PUBLIC_APP_URL,
  targets: {
    auth: env.AUTH_SERVICE_URL,
    workspace: env.WORKSPACE_SERVICE_URL,
    message: env.MESSAGE_SERVICE_URL,
    realtime: env.REALTIME_SERVICE_URL,
    file: env.FILE_SERVICE_URL,
    call: env.CALL_SERVICE_URL,
    notification: env.NOTIFICATION_SERVICE_URL,
  },
  cache: new RedisCache(redis),
  rateLimiter: new RedisRateLimiter(redis),
  rateLimits: { perMinute: env.RATE_LIMIT_PER_MINUTE, authPerMinute: env.AUTH_RATE_LIMIT_PER_MINUTE },
});

const subscriber = new RedisStreamEventSubscriber({
  redisUrl: env.REDIS_URL,
  source: 'api-gateway',
  group: 'api-gateway',
  logger,
});
registerCacheInvalidation(subscriber, container.access);
await subscriber.start();

const onUpgrade = createUpgradeHandler(container.routes, container.auth, env.INTERNAL_SECRET, logger);

startServer({
  app: createApp(container),
  port: env.PORT,
  logger,
  configure: (server) => server.on('upgrade', (req, socket, head) => void onUpgrade(req, socket, head)),
  onShutdown: [() => subscriber.stop(), async () => void (await redis.quit())],
});
