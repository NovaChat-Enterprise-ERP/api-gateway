import type { Request, Response } from 'express';
import type { ServiceName } from '../config/routes.js';

export class HealthController {
  constructor(private readonly targets: Record<ServiceName, string>) {}

  services = async (_req: Request, res: Response) => {
    const entries = await Promise.all(
      Object.entries(this.targets).map(async ([name, url]) => {
        try {
          const response = await fetch(new URL('/health', url), { signal: AbortSignal.timeout(2_000) });
          return [name, response.ok ? 'up' : `down (${response.status})`] as const;
        } catch {
          return [name, 'down'] as const;
        }
      }),
    );
    const services = Object.fromEntries(entries);
    const allUp = Object.values(services).every((s) => s === 'up');
    res.status(allUp ? 200 : 207).json({ gateway: 'up', services });
  };
}
