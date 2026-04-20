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
