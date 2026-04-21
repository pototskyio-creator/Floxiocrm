CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"integration_instance_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"from_email" text,
	"from_name" text,
	"subject" text,
	"body_text" text,
	"received_at" timestamp with time zone NOT NULL,
	"matched_client_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inbox_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_integration_instance_id_integration_instances_id_fk" FOREIGN KEY ("integration_instance_id") REFERENCES "public"."integration_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_matched_client_id_clients_id_fk" FOREIGN KEY ("matched_client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_messages_tenant_idx" ON "inbox_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inbox_messages_instance_idx" ON "inbox_messages" USING btree ("integration_instance_id");--> statement-breakpoint
CREATE INDEX "inbox_messages_client_idx" ON "inbox_messages" USING btree ("matched_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_messages_tenant_instance_message_uq" ON "inbox_messages" USING btree ("tenant_id","integration_instance_id","message_id");--> statement-breakpoint
CREATE INDEX "clients_tenant_email_idx" ON "clients" USING btree ("tenant_id","email");