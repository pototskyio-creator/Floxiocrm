-- RLS on pipelines/stages/projects, same pattern as clients: FORCE RLS + an
-- admin-bypass policy (app.admin='on') + a tenant-scope policy.

ALTER TABLE "pipelines" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stages"    FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects"  FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "pipelines_admin_all" ON "pipelines"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "pipelines_tenant_all" ON "pipelines"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));--> statement-breakpoint

CREATE POLICY "stages_admin_all" ON "stages"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "stages_tenant_all" ON "stages"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));--> statement-breakpoint

CREATE POLICY "projects_admin_all" ON "projects"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "projects_tenant_all" ON "projects"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
