import axios, { type AxiosResponse } from 'axios';

const USER_A = { email: 'owner-a@test.dev', password: 'correct-horse-battery-a' };
const USER_B = { email: 'owner-b@test.dev', password: 'correct-horse-battery-b' };

function extractSessionCookie(res: AxiosResponse): string {
  const setCookie = res.headers['set-cookie'] ?? [];
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  return list
    .map((c) => c.split(';')[0])
    .filter((c) => c.startsWith('better-auth.session_token'))
    .join('; ');
}

async function signIn(user: { email: string; password: string }): Promise<string> {
  const res = await axios.post('/api/auth/sign-in/email', user);
  expect(res.status).toBe(200);
  const cookie = extractSessionCookie(res);
  expect(cookie).toMatch(/^better-auth\.session_token=/);
  return cookie;
}

describe('GET /api', () => {
  it('returns a health message (no auth required)', async () => {
    const res = await axios.get('/api');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('authentication gate', () => {
  it('rejects /api/clients without a session', async () => {
    const res = await axios.get('/api/clients');
    expect(res.status).toBe(401);
  });

  it('rejects /api/clients with a garbage cookie', async () => {
    const res = await axios.get('/api/clients', {
      headers: { cookie: 'better-auth.session_token=not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/clients — tenant isolation via session', () => {
  it('returns only tenant A clients for user A', async () => {
    const cookie = await signIn(USER_A);
    const res = await axios.get('/api/clients', { headers: { cookie } });
    expect(res.status).toBe(200);
    const names = (res.data as Array<{ name: string }>).map((c) => c.name).sort();
    expect(names).toEqual(['Acme Co.', 'Globex']);
  });

  it('returns only tenant B clients for user B', async () => {
    const cookie = await signIn(USER_B);
    const res = await axios.get('/api/clients', { headers: { cookie } });
    expect(res.status).toBe(200);
    const rows = res.data as Array<{ name: string }>;
    expect(rows.map((c) => c.name)).toEqual(['Initech']);
  });
});

describe('POST /api/clients — tenant-scoped writes', () => {
  it('lets user A create a client, and user B cannot see it', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);

    const create = await axios.post(
      '/api/clients',
      { name: 'E2E Fixture Co.' },
      { headers: { cookie: cookieA } }
    );
    expect(create.status).toBe(201);
    const createdId = create.data.id as string;

    const getA = await axios.get(`/api/clients/${createdId}`, { headers: { cookie: cookieA } });
    expect(getA.status).toBe(200);
    expect(getA.data.id).toBe(createdId);

    const getB = await axios.get(`/api/clients/${createdId}`, { headers: { cookie: cookieB } });
    expect(getB.status).toBe(404);
  });
});

describe('GET /api/pipelines — default pipeline', () => {
  it('returns one pipeline with 5 stages in order', async () => {
    const cookie = await signIn(USER_A);
    const res = await axios.get('/api/pipelines', { headers: { cookie } });
    expect(res.status).toBe(200);
    const list = res.data as Array<{
      name: string;
      isDefault: boolean;
      stages: Array<{ name: string; position: number; kind: string }>;
    }>;
    expect(list).toHaveLength(1);
    const [p] = list;
    expect(p.isDefault).toBe(true);
    expect(p.stages.map((s) => s.name)).toEqual(['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']);
    expect(p.stages.map((s) => s.kind)).toEqual(['open', 'open', 'open', 'won', 'lost']);
    expect(p.stages.map((s) => s.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it('isolates pipelines per tenant', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);
    const [a, b] = await Promise.all([
      axios.get('/api/pipelines', { headers: { cookie: cookieA } }),
      axios.get('/api/pipelines', { headers: { cookie: cookieB } }),
    ]);
    expect(a.data[0].id).not.toBe(b.data[0].id);
  });
});

describe('/api/projects — lifecycle', () => {
  it('returns seed projects scoped to the tenant', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);

    const [a, b] = await Promise.all([
      axios.get('/api/projects', { headers: { cookie: cookieA } }),
      axios.get('/api/projects', { headers: { cookie: cookieB } }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect((a.data as Array<{ title: string }>).map((p) => p.title).sort()).toEqual([
      'Acme landing redesign',
      'Globex API integration',
    ]);
    expect((b.data as Array<{ title: string }>).map((p) => p.title)).toEqual([
      'Initech TPS report automation',
    ]);
  });

  it('creates a project under the default pipeline + first open stage when not specified', async () => {
    const cookie = await signIn(USER_A);
    const clients = await axios.get('/api/clients', { headers: { cookie } });
    const clientId = clients.data[0].id as string;

    const create = await axios.post(
      '/api/projects',
      { clientId, title: 'E2E — auto-placed project' },
      { headers: { cookie } }
    );
    expect(create.status).toBe(201);
    expect(create.data.clientId).toBe(clientId);

    const pipelines = await axios.get('/api/pipelines', { headers: { cookie } });
    const firstOpenStage = pipelines.data[0].stages.find(
      (s: { kind: string }) => s.kind === 'open'
    );
    expect(create.data.pipelineId).toBe(pipelines.data[0].id);
    expect(create.data.stageId).toBe(firstOpenStage.id);
  });

  it('moves a project to another stage in the same pipeline', async () => {
    const cookie = await signIn(USER_A);
    const pipelines = await axios.get('/api/pipelines', { headers: { cookie } });
    const stages = pipelines.data[0].stages as Array<{ id: string; name: string }>;
    const wonStageId = stages.find((s) => s.name === 'Won')!.id;

    const projects = await axios.get('/api/projects', { headers: { cookie } });
    const project = (projects.data as Array<{ id: string; title: string }>).find(
      (p) => p.title === 'Acme landing redesign'
    )!;

    const move = await axios.post(
      `/api/projects/${project.id}/move`,
      { stageId: wonStageId },
      { headers: { cookie } }
    );
    expect(move.status).toBe(201);
    expect(move.data.stageId).toBe(wonStageId);
  });

  it('rejects a cross-pipeline move (400)', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);
    const pipesA = await axios.get('/api/pipelines', { headers: { cookie: cookieA } });
    const pipesB = await axios.get('/api/pipelines', { headers: { cookie: cookieB } });
    const userAProjects = await axios.get('/api/projects', { headers: { cookie: cookieA } });

    // Tenant B's stage id is RLS-invisible to tenant A — expect a 400 (the
    // service treats an unknown stage as "does not belong to this pipeline").
    const foreignStageId = pipesB.data[0].stages[0].id;
    const projectA = userAProjects.data[0];
    void pipesA; // silence unused-var lint

    const res = await axios.post(
      `/api/projects/${projectA.id}/move`,
      { stageId: foreignStageId },
      { headers: { cookie: cookieA } }
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when another tenant tries to read a project', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);
    const projectsA = await axios.get('/api/projects', { headers: { cookie: cookieA } });
    const someProjectAId = projectsA.data[0].id as string;

    const cross = await axios.get(`/api/projects/${someProjectAId}`, {
      headers: { cookie: cookieB },
    });
    expect(cross.status).toBe(404);
  });
});

describe('/api/tasks — CRUD + auto-reminder → worker fires it', () => {
  it('creates a task, enqueues a reminder, and the worker fires it', async () => {
    const cookie = await signIn(USER_A);

    const fireInMs = 1500;
    const dueAt = new Date(Date.now() + fireInMs).toISOString();

    const created = await axios.post(
      '/api/tasks',
      {
        title: 'E2E — follow up with Acme',
        dueAt,
        reminder: { channel: 'in_app', offsetSeconds: 0 },
      },
      { headers: { cookie } }
    );
    expect(created.status).toBe(201);
    const taskId = created.data.id as string;

    // Reminder row exists and is pending.
    const pending = await axios.get(`/api/tasks/${taskId}/reminders`, { headers: { cookie } });
    expect(pending.status).toBe(200);
    expect(pending.data).toHaveLength(1);
    expect(pending.data[0].status).toBe('pending');
    expect(pending.data[0].channel).toBe('in_app');
    expect(pending.data[0].jobId).toBeTruthy();

    // Wait long enough for the worker to pick up the delayed job.
    await new Promise((r) => setTimeout(r, fireInMs + 2500));

    const fired = await axios.get(`/api/tasks/${taskId}/reminders`, { headers: { cookie } });
    expect(fired.status).toBe(200);
    expect(fired.data[0].status).toBe('fired');
    expect(fired.data[0].firedAt).toBeTruthy();
    expect(fired.data[0].attempts).toBeGreaterThanOrEqual(1);
  }, 15_000);

  it('isolates tasks between tenants', async () => {
    const cookieA = await signIn(USER_A);
    const cookieB = await signIn(USER_B);

    const create = await axios.post(
      '/api/tasks',
      { title: 'Private to tenant A' },
      { headers: { cookie: cookieA } }
    );
    const taskId = create.data.id as string;

    const getA = await axios.get(`/api/tasks/${taskId}`, { headers: { cookie: cookieA } });
    expect(getA.status).toBe(200);

    const getB = await axios.get(`/api/tasks/${taskId}`, { headers: { cookie: cookieB } });
    expect(getB.status).toBe(404);
  });

  it('marks task done via PUT (sets completedAt)', async () => {
    const cookie = await signIn(USER_A);
    const create = await axios.post(
      '/api/tasks',
      { title: 'Close me out' },
      { headers: { cookie } }
    );
    const taskId = create.data.id as string;
    expect(create.data.completedAt).toBeNull();

    const done = await axios.put(
      `/api/tasks/${taskId}`,
      { status: 'done' },
      { headers: { cookie } }
    );
    expect(done.status).toBe(200);
    expect(done.data.status).toBe('done');
    expect(done.data.completedAt).toBeTruthy();
  });
});

describe('/api/integrations — registry + install', () => {
  it('returns the seeded in_app instance per tenant', async () => {
    const cookie = await signIn(USER_A);
    const res = await axios.get('/api/integrations', { headers: { cookie } });
    expect(res.status).toBe(200);
    const rows = res.data as Array<{ kind: string; status: string }>;
    const inApp = rows.find((r) => r.kind === 'in_app');
    expect(inApp).toBeDefined();
    expect(inApp!.status).toBe('active');
  });

  it('exposes the registered kinds via /kinds', async () => {
    const cookie = await signIn(USER_A);
    const res = await axios.get('/api/integrations/kinds', { headers: { cookie } });
    expect(res.status).toBe(200);
    const kinds = (res.data as Array<{ kind: string }>).map((k) => k.kind);
    expect(kinds).toContain('in_app');
  });

  it('rejects an unknown adapter kind with 404', async () => {
    const cookie = await signIn(USER_A);
    const res = await axios.post(
      '/api/integrations',
      { kind: 'does-not-exist', name: 'nope' },
      { headers: { cookie } }
    );
    expect(res.status).toBe(404);
  });
});
