import { z } from 'zod';
import { baseEnvSchema, loadEnv, serviceUrl } from '@novachat-enterprise-erp/common';

const schema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4000),
  REDIS_URL: z.string().min(1),
  PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  AUTH_SERVICE_URL: serviceUrl('http://localhost:4001'),
  WORKSPACE_SERVICE_URL: serviceUrl('http://localhost:4002'),
  MESSAGE_SERVICE_URL: serviceUrl('http://localhost:4003'),
  REALTIME_SERVICE_URL: serviceUrl('http://localhost:4004'),
  FILE_SERVICE_URL: serviceUrl('http://localhost:4005'),
  CALL_SERVICE_URL: serviceUrl('http://localhost:4006'),
  NOTIFICATION_SERVICE_URL: serviceUrl('http://localhost:4007'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(600),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
});

export type Env = z.infer<typeof schema>;

export const loadGatewayEnv = (): Env => loadEnv(schema);
