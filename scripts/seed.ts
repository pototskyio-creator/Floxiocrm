import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb, closeDb, schema } from '@org/core-domain';
import { createAuth } from '@org/core-auth';

interface Fixture {
  email: string;
  password: string;
  name: string;
  orgName: string;
  orgSlug: string;
  clients: string[];
}

const FIXTURES: Fixture[] = [
  {
    email: 'owner-a@test.dev',
    password: 'correct-horse-battery-a',
    name: 'Owner A',
    orgName: 'Tenant A',
    orgSlug: 'tenant-a',
    clients: ['Acme Co.', 'Globex'],
  },
  {
    email: 'owner-b@test.dev',
    password: 'correct-horse-battery-b',
    name: 'Owner B',
    orgName: 'Tenant B',
    orgSlug: 'tenant-b',
    clients: ['Initech'],
  },
];

function extractSessionCookie(setCookie: string[] | string | null | undefined): string {
  if (!setCookie) return '';
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  return list
    .map((c) => c.split(';')[0])
    .filter((c) => c.startsWith('better-auth.session_token'))
    .join('; ');
}

async function main() {
  const auth = createAuth();
  const db = getDb();

  // Nuke everything the seed owns. Run as admin to bypass RLS on `clients`.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);
    await tx.execute(sql`TRUNCATE TABLE clients, invitation, member, organization, session, account, "user", verification RESTART IDENTITY CASCADE`);
  });

  const createdOrgs: Array<{ slug: string; id: string; clients: string[] }> = [];

  for (const f of FIXTURES) {
    const signUp = await auth.api.signUpEmail({
      body: { email: f.email, password: f.password, name: f.name },
      returnHeaders: true,
    });

    const setCookies = signUp.headers.getSetCookie?.() ?? signUp.headers.get('set-cookie');
    const cookieHeader = extractSessionCookie(setCookies);

    const authHeaders = new Headers();
    if (cookieHeader) authHeaders.set('cookie', cookieHeader);

    const org = await auth.api.createOrganization({
      body: { name: f.orgName, slug: f.orgSlug, userId: undefined as never },
      headers: authHeaders,
    });

    if (!org) throw new Error(`Failed to create org ${f.orgSlug}`);
    createdOrgs.push({ slug: f.orgSlug, id: org.id, clients: f.clients });
  }

  // Insert sample clients directly (fast, deterministic).
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);
    for (const o of createdOrgs) {
      for (const name of o.clients) {
        await tx.insert(schema.clients).values({ tenantId: o.id, name });
      }
    }
  });

  console.log('Seeded:');
  for (const o of createdOrgs) console.log(`  ${o.slug.padEnd(10)} org id=${o.id} clients=${o.clients.join(', ')}`);

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
