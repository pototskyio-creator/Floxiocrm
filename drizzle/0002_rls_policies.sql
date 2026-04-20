-- RLS policies: every tenant-owned row is scoped to the current session's app.tenant_id.
-- FORCE RLS so the table owner is subject to the policies (we don't run app code under a
-- separate role yet). Admin work (migrations, seeding, maintenance) sets `app.admin='on'`
-- inside a transaction to bypass the scoping — regular API code never sets it.

ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users"   FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Admin bypass: any operation permitted when app.admin='on' in the current session.
CREATE POLICY "tenants_admin_all" ON "tenants"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "users_admin_all" ON "users"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "clients_admin_all" ON "clients"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

-- Tenant scoping: the session may only see/modify rows matching app.tenant_id.
CREATE POLICY "tenants_self_select" ON "tenants"
  FOR SELECT
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint

CREATE POLICY "users_tenant_all" ON "users"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint

CREATE POLICY "clients_tenant_all" ON "clients"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
