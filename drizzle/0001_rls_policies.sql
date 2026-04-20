-- RLS on tenant-scoped domain tables only. Better Auth's own tables
-- (user/session/account/verification/organization/member/invitation) are managed
-- by the framework at the application layer and stay RLS-free — otherwise the
-- adapter's cross-tenant writes (new members, invitations) would be blocked.

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Admin bypass: migrations and seed scripts set app.admin='on' in a transaction.
CREATE POLICY "clients_admin_all" ON "clients"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

-- Tenant scope. tenant_id is text (= organization.id).
CREATE POLICY "clients_tenant_all" ON "clients"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
