import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

// Shared column helpers — every table gets these.
const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// tenants: the root isolation unit. One per installation today.
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
  ...auditColumns,
});

// users: authenticated operators within a tenant.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    timezone: text('timezone').notNull().default('UTC'),
    locale: text('locale').notNull().default('ru'),
    telegramChatId: text('telegram_chat_id'),
    emailVerified: boolean('email_verified').notNull().default(false),
    ...auditColumns,
  },
  (t) => [
    index('users_tenant_idx').on(t.tenantId),
    index('users_email_idx').on(t.email),
  ]
);

// NOTE: further entities (clients, projects, stages, reminders, messages, ...)
// будут добавлены в Д1-Д9 по мере прохождения соответствующих этапов плана.
// Это даёт чистую миграционную историю и не тащит мёртвые колонки.
