-- RLS on tasks/reminders following the clients/projects precedent:
-- FORCE RLS + admin-bypass policy + tenant-scope policy.

ALTER TABLE "tasks"     FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reminders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "tasks_admin_all" ON "tasks"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "tasks_tenant_all" ON "tasks"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));--> statement-breakpoint

CREATE POLICY "reminders_admin_all" ON "reminders"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "reminders_tenant_all" ON "reminders"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
