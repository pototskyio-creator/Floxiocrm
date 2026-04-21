import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
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

// pipelines: a sales funnel definition. Each tenant has >= 1.
export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    ...auditColumns,
  },
  (t) => [
    index('pipelines_tenant_idx').on(t.tenantId),
  ]
).enableRLS();

// stages: ordered steps within a pipeline. `position` is the sort key;
// `(pipeline_id, position)` is unique within a tenant so moves are deterministic.
export const stages = pgTable(
  'stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    // 'open' stages count as in-progress; 'won'/'lost' are terminal. Kept as
    // a loose text enum so per-tenant customization is easy later.
    kind: text('kind', { enum: ['open', 'won', 'lost'] })
      .notNull()
      .default('open'),
    ...auditColumns,
  },
  (t) => [
    index('stages_tenant_idx').on(t.tenantId),
    index('stages_pipeline_idx').on(t.pipelineId),
    uniqueIndex('stages_pipeline_position_uq').on(t.pipelineId, t.position),
  ]
).enableRLS();

// projects: a deal/engagement attached to a client, moving through stages.
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'restrict' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    // Amount stored in cents (int4, max ~$21M/deal — plenty for freelancer MVP).
    // Currency is per-project so multi-currency operators don't pick a single one.
    amountCents: integer('amount_cents'),
    currency: text('currency'),
    notes: text('notes'),
    ...auditColumns,
  },
  (t) => [
    index('projects_tenant_idx').on(t.tenantId),
    index('projects_client_idx').on(t.clientId),
    index('projects_stage_idx').on(t.stageId),
  ]
).enableRLS();

// tasks: actionable items, optionally scoped to a client or project.
// Declared after projects so the project_id FK resolves cleanly.
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    assigneeUserId: text('assignee_user_id').references(() => user.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['open', 'done', 'canceled'] })
      .notNull()
      .default('open'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [
    index('tasks_tenant_idx').on(t.tenantId),
    index('tasks_client_idx').on(t.clientId),
    index('tasks_project_idx').on(t.projectId),
    index('tasks_tenant_status_idx').on(t.tenantId, t.status),
    index('tasks_due_at_idx').on(t.dueAt),
  ]
).enableRLS();

// reminders: scheduled notifications attached to a task. The worker picks up
// pending ones from the BullMQ queue at fire_at and marks them fired.
// channel hints which integration adapter should deliver the message —
// actual delivery wiring (Telegram) lands in Д7.
export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    fireAt: timestamp('fire_at', { withTimezone: true }).notNull(),
    channel: text('channel', { enum: ['telegram', 'email', 'in_app'] })
      .notNull()
      .default('in_app'),
    status: text('status', { enum: ['pending', 'fired', 'failed', 'canceled'] })
      .notNull()
      .default('pending'),
    // BullMQ job id — lets us cancel/inspect the delayed job later.
    jobId: text('job_id'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    firedAt: timestamp('fired_at', { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [
    index('reminders_tenant_idx').on(t.tenantId),
    index('reminders_task_idx').on(t.taskId),
    index('reminders_status_fire_at_idx').on(t.status, t.fireAt),
  ]
).enableRLS();
