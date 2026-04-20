import axios from 'axios';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

describe('GET /api', () => {
  it('returns a health message (no tenant required)', async () => {
    const res = await axios.get('/api');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('GET /api/clients — tenant isolation', () => {
  it('rejects requests without x-tenant-id', async () => {
    const res = await axios.get('/api/clients');
    expect(res.status).toBe(400);
  });

  it('rejects requests with a non-UUID tenant header', async () => {
    const res = await axios.get('/api/clients', {
      headers: { 'x-tenant-id': 'not-a-uuid' },
    });
    expect(res.status).toBe(400);
  });

  it('returns only tenant A clients when tenant A asks', async () => {
    const res = await axios.get('/api/clients', {
      headers: { 'x-tenant-id': TENANT_A },
    });
    expect(res.status).toBe(200);
    const rows = res.data as Array<{ name: string; tenantId: string }>;
    const names = rows.map((c) => c.name).sort();
    expect(names).toEqual(['Acme Co.', 'Globex']);
    for (const c of rows) expect(c.tenantId).toBe(TENANT_A);
  });

  it('returns only tenant B clients when tenant B asks', async () => {
    const res = await axios.get('/api/clients', {
      headers: { 'x-tenant-id': TENANT_B },
    });
    expect(res.status).toBe(200);
    const rows = res.data as Array<{ name: string; tenantId: string }>;
    expect(rows.map((c) => c.name)).toEqual(['Initech']);
    expect(rows[0].tenantId).toBe(TENANT_B);
  });
});

describe('POST /api/clients — tenant-scoped writes', () => {
  it('creates a client under the sending tenant and hides it from other tenants', async () => {
    const create = await axios.post(
      '/api/clients',
      { name: 'E2E Fixture Co.' },
      { headers: { 'x-tenant-id': TENANT_A } }
    );
    expect(create.status).toBe(201);
    expect(create.data.tenantId).toBe(TENANT_A);
    const createdId = create.data.id as string;

    const getA = await axios.get(`/api/clients/${createdId}`, {
      headers: { 'x-tenant-id': TENANT_A },
    });
    expect(getA.status).toBe(200);
    expect(getA.data.id).toBe(createdId);

    // Other tenant: RLS hides the row, controller returns 404.
    const getB = await axios.get(`/api/clients/${createdId}`, {
      headers: { 'x-tenant-id': TENANT_B },
    });
    expect(getB.status).toBe(404);
  });
});
