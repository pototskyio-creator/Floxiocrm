'use client';

// Thin browser-side API helper. Uses the Next.js origin (same-origin /api/*)
// is not an option — the API runs on a different port — so we hit it directly
// with credentials:include so Better Auth's session cookie rides along.

const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  // DELETE/204 has no body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
