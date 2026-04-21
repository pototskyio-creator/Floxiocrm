-- RLS on integration_instances + notifications. Same admin/tenant-scope pattern.

ALTER TABLE "integration_instances" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications"         FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "integration_instances_admin_all" ON "integration_instances"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "integration_instances_tenant_all" ON "integration_instances"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));--> statement-breakpoint

CREATE POLICY "notifications_admin_all" ON "notifications"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "notifications_tenant_all" ON "notifications"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
