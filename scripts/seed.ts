import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { getDb, closeDb, schema } from '@org/core-domain';
import { createAuth } from '@org/core-auth';
import { QUEUE_NAMES } from '@org/core-jobs';

interface Fixture {
  email: string;
  password: string;
  name: string;
  orgName: string;
  orgSlug: string;
  clients: string[];
  projects: Array<{ clientName: string; title: string; stage: string; amountCents?: number }>;
}

const DEFAULT_PIPELINE_NAME = 'Sales';
const DEFAULT_STAGES: Array<{ name: string; kind: 'open' | 'won' | 'lost' }> = [
  { name: 'Lead', kind: 'open' },
  { name: 'Qualified', kind: 'open' },
  { name: 'Proposal', kind: 'open' },
  { name: 'Won', kind: 'won' },
  { name: 'Lost', kind: 'lost' },
];

const FIXTURES: Fixture[] = [
  {
    email: 'owner-a@test.dev',
    password: 'correct-horse-battery-a',
    name: 'Owner A',
    orgName: 'Tenant A',
    orgSlug: 'tenant-a',
    clients: ['Acme Co.', 'Globex'],
    projects: [
      { clientName: 'Acme Co.', title: 'Acme landing redesign', stage: 'Proposal', amountCents: 500_000 },
      { clientName: 'Globex', title: 'Globex API integration', stage: 'Qualified' },
    ],
  },
  {
    email: 'owner-b@test.dev',
    password: 'correct-horse-battery-b',
    name: 'Owner B',
    orgName: 'Tenant B',
    orgSlug: 'tenant-b',
    clients: ['Initech'],
    projects: [{ clientName: 'Initech', title: 'Initech TPS report automation', stage: 'Lead' }],
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

async function wipeRemindersQueue() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const connection = new Redis(url, { maxRetriesPerRequest: null });
  const q = new Queue(QUEUE_NAMES.reminders, { connection });
  try {
    await q.obliterate({ force: true });
  } catch {
    // fresh install has nothing to obliterate
  }
  await q.close();
  await connection.quit();
}

async function main() {
  const auth = createAuth();
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);
    await tx.execute(
      sql`TRUNCATE TABLE reminders, tasks, projects, stages, pipelines, clients, invitation, member, organization, session, account, "user", verification RESTART IDENTITY CASCADE`
    );
  });

  await wipeRemindersQueue();

  const createdTenants: Array<{
    fixture: Fixture;
    orgId: string;
    clientIds: Map<string, string>;
    stageIds: Map<string, string>;
    pipelineId: string;
  }> = [];

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

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.admin', 'on', true)`);

      const [pipeline] = await tx
        .insert(schema.pipelines)
        .values({ tenantId: org.id, name: DEFAULT_PIPELINE_NAME, isDefault: true })
        .returning();

      const stageRows = await tx
        .insert(schema.stages)
        .values(
          DEFAULT_STAGES.map((s, idx) => ({
            tenantId: org.id,
            pipelineId: pipeline.id,
            name: s.name,
            kind: s.kind,
            position: idx,
          }))
        )
        .returning();
      const stageIds = new Map(stageRows.map((s) => [s.name, s.id]));

      const clientRows = await tx
        .insert(schema.clients)
        .values(f.clients.map((name) => ({ tenantId: org.id, name })))
        .returning();
      const clientIds = new Map(clientRows.map((c) => [c.name, c.id]));

      for (const p of f.projects) {
        const clientId = clientIds.get(p.clientName);
        const stageId = stageIds.get(p.stage);
        if (!clientId || !stageId) {
          throw new Error(`Seed mismatch: client ${p.clientName} or stage ${p.stage} not found`);
        }
        await tx.insert(schema.projects).values({
          tenantId: org.id,
          clientId,
          pipelineId: pipeline.id,
          stageId,
          title: p.title,
          amountCents: p.amountCents ?? null,
          currency: p.amountCents ? 'USD' : null,
        });
      }

      return { pipelineId: pipeline.id, stageIds, clientIds };
    });

    createdTenants.push({ fixture: f, orgId: org.id, ...result });
  }

  console.log('Seeded:');
  for (const t of createdTenants) {
    console.log(
      `  ${t.fixture.orgSlug.padEnd(10)} org=${t.orgId} pipeline=${t.pipelineId} ` +
        `stages=${t.stageIds.size} clients=${t.clientIds.size} projects=${t.fixture.projects.length}`
    );
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
