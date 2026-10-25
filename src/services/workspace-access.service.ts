import type { WorkspaceAccessDto } from '@novachat-enterprise-erp/contracts';
import type { InternalHttpClient } from '@novachat-enterprise-erp/common';
import type { KeyValueCache } from '@novachat-enterprise-erp/cache';

const TTL_SECONDS = 60;

export class WorkspaceAccessService {
  constructor(
    private readonly cache: KeyValueCache,
    private readonly workspaceClient: InternalHttpClient,
  ) {}

  async resolve(workspaceId: string, userId: string, requestId?: string): Promise<WorkspaceAccessDto | null> {
    const key = WorkspaceAccessService.key(workspaceId, userId);
    const cached = await this.cache.get<WorkspaceAccessDto | { missing: true }>(key);
    if (cached) return 'missing' in cached ? null : cached;

    const access = await this.workspaceClient.request<WorkspaceAccessDto>(
      `/internal/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}/access`,
      { requestId },
    );
    await this.cache.set(key, access ?? { missing: true }, access ? TTL_SECONDS : 10);
    return access;
  }

  async invalidate(workspaceId: string, userId?: string): Promise<void> {
    if (userId) await this.cache.del(WorkspaceAccessService.key(workspaceId, userId));
    else await this.cache.delByPrefix(`access:${workspaceId}:`);
  }

  static key(workspaceId: string, userId: string): string {
    return `access:${workspaceId}:${userId}`;
  }
}
