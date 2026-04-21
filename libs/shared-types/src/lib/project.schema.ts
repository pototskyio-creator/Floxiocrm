import { z } from 'zod';

export const projectSchema = z.object({
  id: z.uuid(),
  tenantId: z.string(),
  clientId: z.uuid(),
  pipelineId: z.uuid(),
  stageId: z.uuid(),
  title: z.string().min(1).max(200),
  amountCents: z.int().nullable(),
  currency: z.string().length(3).nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectDtoSchema = z.object({
  clientId: z.uuid(),
  title: z.string().min(1).max(200),
  // pipelineId/stageId optional — service picks the tenant's default pipeline
  // + its first 'open' stage when omitted.
  pipelineId: z.uuid().optional(),
  stageId: z.uuid().optional(),
  amountCents: z.int().min(0).max(2_000_000_000).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  notes: z.string().max(10_000).nullable().optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectDtoSchema>;

export const updateProjectDtoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amountCents: z.int().min(0).max(2_000_000_000).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
  notes: z.string().max(10_000).nullable().optional(),
});
export type UpdateProjectDto = z.infer<typeof updateProjectDtoSchema>;

export const moveProjectDtoSchema = z.object({
  stageId: z.uuid(),
});
export type MoveProjectDto = z.infer<typeof moveProjectDtoSchema>;

export const listProjectsQuerySchema = z.object({
  clientId: z.uuid().optional(),
  pipelineId: z.uuid().optional(),
  stageId: z.uuid().optional(),
  stageKind: z.enum(['open', 'won', 'lost']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
