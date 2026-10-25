import { describe, expect, it } from 'vitest';
import { RealtimeTicketService } from './realtime-ticket.service.js';

describe('RealtimeTicketService', () => {
  const tickets = new RealtimeTicketService('k'.repeat(32), 60);

  it('round-trips valid tickets', () => {
    const { ticket } = tickets.issue({ userId: 'u1', name: 'Ada' });
    expect(tickets.verify(ticket)).toMatchObject({ userId: 'u1', name: 'Ada' });
  });

  it('rejects expired, tampered and foreign tickets', () => {
    const { ticket } = tickets.issue({ userId: 'u1' }, Date.now() - 120_000);
    expect(tickets.verify(ticket)).toBeNull();
    const fresh = tickets.issue({ userId: 'u1' }).ticket;
    const forged = `${Buffer.from(JSON.stringify({ userId: 'admin', exp: Date.now() + 60_000 })).toString('base64url')}.${fresh.split('.')[1]}`;
    expect(tickets.verify(forged)).toBeNull();
    expect(new RealtimeTicketService('x'.repeat(32)).verify(fresh)).toBeNull();
    expect(tickets.verify('garbage')).toBeNull();
  });
});
