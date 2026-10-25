import { EVENTS, type DomainEvent } from '@novachat-enterprise-erp/contracts';
import type { EventSubscriber } from '@novachat-enterprise-erp/events';
import type { WorkspaceAccessService } from '../services/workspace-access.service.js';

interface MemberEventData {
  userId: string;
}

export const registerCacheInvalidation = (subscriber: EventSubscriber, access: WorkspaceAccessService): void => {
  const byMember = async (event: DomainEvent<MemberEventData>) => {
    if (event.workspaceId) await access.invalidate(event.workspaceId, event.data.userId);
  };
  const byWorkspace = async (event: DomainEvent) => {
    if (event.workspaceId) await access.invalidate(event.workspaceId);
  };

  subscriber
    .on(EVENTS.MEMBER_JOINED, byMember)
    .on(EVENTS.MEMBER_REMOVED, byMember)
    .on(EVENTS.MEMBER_ROLE_CHANGED, byMember)
    .on(EVENTS.MEMBER_DEACTIVATED, byMember)
    .on(EVENTS.MEMBER_REACTIVATED, byMember)
    .on(EVENTS.ROLE_UPDATED, byWorkspace);
};
