import { cookies, headers } from 'next/headers';

// Server-side fetch helper that forwards the incoming request's cookies to the
// NestJS API so session-authenticated endpoints work inside server components.
export async function fetchFromApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const base = process.env.API_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getServerSession(): Promise<{
  user: { id: string; email: string; name: string };
  session: { id: string; activeOrganizationId: string | null };
} | null> {
  // Hit /api/auth/get-session with the user's cookies. Returns null on
  // unauthenticated / expired sessions instead of throwing.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const h = await headers();
  const base = process.env.API_BASE_URL ?? 'http://localhost:3001';

  const res = await fetch(`${base}/api/auth/get-session`, {
    headers: { cookie: cookieHeader, 'user-agent': h.get('user-agent') ?? '' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || !data.user) return null;
  return data;
}
