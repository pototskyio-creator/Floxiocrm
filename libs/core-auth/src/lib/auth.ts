import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@org/core-domain';

export type AuthInstance = ReturnType<typeof createAuth>;

// Factory so consumers can pass a custom DB (e.g. tests). Defaults to the
// admin DATABASE_URL because the auth framework writes across tenants
// (users, sessions, memberships) and can't be subject to per-tenant RLS.
export function createAuth(opts?: { databaseUrl?: string }) {
  const db = getDb(opts?.databaseUrl ?? process.env.DATABASE_URL);

  return betterAuth({
    baseURL: process.env.API_BASE_URL ?? 'http://localhost:3001',
    basePath: '/api/auth',
    secret: process.env.SESSION_SECRET,
    trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    databaseHooks: {
      session: {
        create: {
          // When a user signs in (or signs up), if they have exactly one
          // organization and no active one chosen yet, pin that org as active.
          // Spares the client an extra /organization/set-active round trip
          // for the common single-org-per-user flow.
          before: async (session) => {
            const memberships = await db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId as string))
              .limit(2);
            if (memberships.length === 1 && !session.activeOrganizationId) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: memberships[0].organizationId,
                },
              };
            }
            return;
          },
        },
      },
    },
    plugins: [organization()],
  });
}
