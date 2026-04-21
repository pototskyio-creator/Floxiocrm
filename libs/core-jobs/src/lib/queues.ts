// Central registry of every BullMQ queue name used across the monorepo.
// Add new queues here — not as inline string literals — so producers and
// consumers stay in lockstep.
export const QUEUE_NAMES = {
  reminders: 'reminders',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job payload for the reminders queue. Worker receives this and does lookups
// against the `reminders` table — the queue is an orchestration signal, not
// the source of truth.
export interface ReminderJob {
  reminderId: string;
  tenantId: string;
}
