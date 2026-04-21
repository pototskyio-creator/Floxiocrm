import { z } from 'zod';

export const stageKindSchema = z.enum(['open', 'won', 'lost']);
export type StageKind = z.infer<typeof stageKindSchema>;

export const stageSchema = z.object({
  id: z.uuid(),
  tenantId: z.string(),
  pipelineId: z.uuid(),
  name: z.string(),
  position: z.int().min(0),
  kind: stageKindSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Stage = z.infer<typeof stageSchema>;

export const pipelineSchema = z.object({
  id: z.uuid(),
  tenantId: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Pipeline = z.infer<typeof pipelineSchema>;

export const pipelineWithStagesSchema = pipelineSchema.extend({
  stages: z.array(stageSchema),
});
export type PipelineWithStages = z.infer<typeof pipelineWithStagesSchema>;
