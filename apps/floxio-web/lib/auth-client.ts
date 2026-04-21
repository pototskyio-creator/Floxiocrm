import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

// Browser-side Better Auth client. baseURL points to the NestJS API;
// the `basePath` mirrors how the server mounts routes under /api/auth.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  basePath: '/api/auth',
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
