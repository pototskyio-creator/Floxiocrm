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

// Shared column helpers — every app table gets these.
const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ─── Better Auth core (user/session/account/verification) ─────────────────────
// IDs are text (Better Auth generates string IDs on insert). Columns match the
// names Better Auth's Drizzle adapter expects (camelCase in TS → snake_case in DB
// via the global `casing: 'snake_case'` setting in the client).

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    activeOrganizationId: text('active_organization_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('session_user_idx').on(t.userId)]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('account_user_idx').on(t.userId)]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)]
);

// ─── Better Auth organization plugin ──────────────────────────────────────────

export const organization = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('organization_slug_idx').on(t.slug)]
);

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('member_organization_idx').on(t.organizationId),
    index('member_user_idx').on(t.userId),
  ]
);

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invitation_organization_idx').on(t.organizationId)]
);

// ─── App domain ───────────────────────────────────────────────────────────────
// `tenantId` keeps its semantic name; under the hood it's the organization.id.

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'archived'] })
      .notNull()
      .default('active'),
    notes: text('notes'),
    tags: jsonb('tags').notNull().default(sql`'[]'::jsonb`),
    ...auditColumns,
  },
  (t) => [
    index('clients_tenant_idx').on(t.tenantId),
    index('clients_tenant_status_idx').on(t.tenantId, t.status),
  ]
).enableRLS();
