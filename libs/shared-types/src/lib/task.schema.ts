import { z } from 'zod';

export const taskStatusSchema = z.enum(['open', 'done', 'canceled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const reminderChannelSchema = z.enum(['telegram', 'email', 'in_app']);
export type ReminderChannel = z.infer<typeof reminderChannelSchema>;

export const reminderStatusSchema = z.enum(['pending', 'fired', 'failed', 'canceled']);
export type ReminderStatus = z.infer<typeof reminderStatusSchema>;

export const taskSchema = z.object({
  id: z.uuid(),
  tenantId: z.string(),
  clientId: z.uuid().nullable(),
  projectId: z.uuid().nullable(),
  assigneeUserId: z.string().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: taskStatusSchema,
  dueAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskDtoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).nullable().optional(),
  clientId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  assigneeUserId: z.string().nullable().optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  // Optional: schedule a reminder at the same dueAt on the given channel.
  // Omit to skip auto-reminder; pass { channel } with dueAt to enable.
  reminder: z
    .object({
      channel: reminderChannelSchema.default('in_app'),
      // `offsetSeconds` lets callers schedule N seconds before/after dueAt.
      // Positive = before due. Default: fire exactly at dueAt.
      offsetSeconds: z.int().min(-365 * 24 * 3600).max(365 * 24 * 3600).default(0),
    })
    .optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskDtoSchema>;

export const updateTaskDtoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  status: taskStatusSchema.optional(),
  dueAt: z.iso.datetime().nullable().optional(),
  clientId: z.uuid().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
});
export type UpdateTaskDto = z.infer<typeof updateTaskDtoSchema>;

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  clientId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  dueBefore: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const reminderSchema = z.object({
  id: z.uuid(),
  tenantId: z.string(),
  taskId: z.uuid(),
  fireAt: z.iso.datetime(),
  channel: reminderChannelSchema,
  status: reminderStatusSchema,
  jobId: z.string().nullable(),
  attempts: z.int(),
  lastError: z.string().nullable(),
  lastAttemptAt: z.iso.datetime().nullable(),
  firedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Reminder = z.infer<typeof reminderSchema>;
