import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb, closeDb, schema } from '@org/core-domain';

const FIXED_TENANT_A = '11111111-1111-4111-8111-111111111111';
const FIXED_TENANT_B = '22222222-2222-4222-8222-222222222222';

async function main() {
  const db = getDb();

  await db.transaction(async (tx) => {
    // Admin context — bypasses RLS for the duration of this transaction.
    await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);

    // Clean slate on tenant rows we own (cascades to users/clients).
    await tx.execute(
      sql`DELETE FROM ${schema.tenants} WHERE id IN (${FIXED_TENANT_A}::uuid, ${FIXED_TENANT_B}::uuid) OR slug IN ('tenant-a', 'tenant-b')`
    );

    await tx.insert(schema.tenants).values([
      { id: FIXED_TENANT_A, name: 'Tenant A (dev)', slug: 'tenant-a' },
      { id: FIXED_TENANT_B, name: 'Tenant B (dev)', slug: 'tenant-b' },
    ]);

    await tx.insert(schema.users).values([
      {
        tenantId: FIXED_TENANT_A,
        email: 'owner@tenant-a.dev',
        name: 'Owner A',
        role: 'owner',
      },
      {
        tenantId: FIXED_TENANT_B,
        email: 'owner@tenant-b.dev',
        name: 'Owner B',
        role: 'owner',
      },
    ]);

    await tx.insert(schema.clients).values([
      { tenantId: FIXED_TENANT_A, name: 'Acme Co.' },
      { tenantId: FIXED_TENANT_A, name: 'Globex' },
      { tenantId: FIXED_TENANT_B, name: 'Initech' },
    ]);
  });

  console.log(`Seeded tenants:\n  A = ${FIXED_TENANT_A}\n  B = ${FIXED_TENANT_B}`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
