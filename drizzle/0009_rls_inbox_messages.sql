-- RLS on inbox_messages, same admin/tenant pattern.

ALTER TABLE "inbox_messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "inbox_messages_admin_all" ON "inbox_messages"
  FOR ALL
  USING (current_setting('app.admin', true) = 'on')
  WITH CHECK (current_setting('app.admin', true) = 'on');--> statement-breakpoint

CREATE POLICY "inbox_messages_tenant_all" ON "inbox_messages"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
