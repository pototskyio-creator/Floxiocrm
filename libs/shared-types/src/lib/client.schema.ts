import { z } from 'zod';

export const clientStatusSchema = z.enum(['active', 'archived']);
export type ClientStatus = z.infer<typeof clientStatusSchema>;

export const clientSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  name: z.string().min(1).max(200),
  status: clientStatusSchema,
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});
export type Client = z.infer<typeof clientSchema>;

export const createClientDtoSchema = z.object({
  name: z.string().min(1).max(200),
  status: clientStatusSchema.optional(),
  notes: z.string().max(10_000).nullable().optional(),
  tags: z.array(z.string().min(1).max(64)).max(32).optional(),
});
export type CreateClientDto = z.infer<typeof createClientDtoSchema>;

export const updateClientDtoSchema = createClientDtoSchema.partial();
export type UpdateClientDto = z.infer<typeof updateClientDtoSchema>;

export const listClientsQuerySchema = z.object({
  status: clientStatusSchema.optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
