import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { z } from 'zod';
import { ClientsAdminRepository } from '@org/core-crm';
import type { IntegrationAdapter } from '../../core/adapter.contract.js';
import { IntegrationRegistry } from '../../core/integration-registry.service.js';
import { InboxMessagesAdminRepository } from './inbox-messages.repository.js';

// Inbound-only adapter. Worker calls poll() on a schedule; we pull unread
// messages, parse MIME with mailparser, upsert a row per Message-ID, and try
// to auto-link the sender to an existing client by email.
const configSchema = z.object({
  host: z.string().min(1).max(200),
  port: z.coerce.number().int().min(1).max(65535).default(993),
  user: z.string().min(1).max(320),
  password: z.string().min(1).max(200),
  // Folder to poll. Gmail labels like "[Gmail]/All Mail" also work.
  folder: z.string().min(1).max(200).default('INBOX'),
  tls: z.coerce.boolean().default(true),
});
export type ImapConfig = z.infer<typeof configSchema>;

interface PollContext {
  tenantId: string;
  integrationInstanceId: string;
}

// The registry only knows poll(config, payload?) — we need tenant+instance
// context alongside config. Poller passes them via `poll(config, ctx)` by
// casting; keeps the contract free of IMAP specifics.
interface ImapAdapterPoll {
  pollWithContext(config: ImapConfig, ctx: PollContext): Promise<{ fetched: number; matched: number }>;
}

@Injectable()
export class ImapAdapter
  implements IntegrationAdapter<ImapConfig>, OnModuleInit, ImapAdapterPoll
{
  readonly kind = 'imap';
  readonly displayName = 'IMAP inbox';
  readonly configSchema = configSchema;

  private readonly logger = new Logger(ImapAdapter.name);

  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly inbox: InboxMessagesAdminRepository,
    private readonly clientsAdmin: ClientsAdminRepository
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  // poll() on the IntegrationAdapter contract only gets config — no context.
  // The poller uses pollWithContext directly.
  async poll(): Promise<void> {
    // no-op — the poller calls pollWithContext. Kept so the contract's
    // `supportsPoll` flag reports true.
  }

  async check(config: ImapConfig): Promise<{ ok: boolean; detail?: string }> {
    return new Promise((resolve) => {
      const imap = new Imap({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        tls: config.tls,
        authTimeout: 10_000,
        tlsOptions: { rejectUnauthorized: true },
      });
      imap.once('ready', () => {
        imap.end();
        resolve({ ok: true, detail: `connected to ${config.host}:${config.port}` });
      });
      imap.once('error', (err: Error) => {
        resolve({ ok: false, detail: err.message });
      });
      imap.connect();
    });
  }

  async pollWithContext(
    config: ImapConfig,
    ctx: PollContext
  ): Promise<{ fetched: number; matched: number }> {
    const emails = await this.fetchUnseen(config);
    let matched = 0;
    for (const e of emails) {
      let matchedClientId: string | null = null;
      if (e.fromEmail) {
        const client = await this.clientsAdmin.findByEmailAdmin(ctx.tenantId, e.fromEmail);
        if (client) {
          matchedClientId = client.id;
          matched += 1;
        }
      }
      await this.inbox.upsertByMessageId({
        tenantId: ctx.tenantId,
        integrationInstanceId: ctx.integrationInstanceId,
        messageId: e.messageId,
        fromEmail: e.fromEmail,
        fromName: e.fromName,
        subject: e.subject,
        bodyText: e.bodyText,
        receivedAt: e.receivedAt,
        matchedClientId,
      });
    }
    this.logger.log(
      `imap poll tenant=${ctx.tenantId} instance=${ctx.integrationInstanceId} fetched=${emails.length} matched=${matched}`
    );
    return { fetched: emails.length, matched };
  }

  // Connects, opens the folder, searches for UNSEEN, fetches bodies, parses
  // with mailparser, resolves with a normalized list. Always closes the
  // connection, even on error. Leaves messages as UNSEEN on the server —
  // dedupe on our side happens via the Message-ID unique index.
  private fetchUnseen(config: ImapConfig): Promise<Array<{
    messageId: string;
    fromEmail: string | null;
    fromName: string | null;
    subject: string | null;
    bodyText: string | null;
    receivedAt: Date;
  }>> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        tls: config.tls,
        authTimeout: 10_000,
        tlsOptions: { rejectUnauthorized: true },
      });
      const out: Array<{
        messageId: string;
        fromEmail: string | null;
        fromName: string | null;
        subject: string | null;
        bodyText: string | null;
        receivedAt: Date;
      }> = [];
      const parsers: Promise<void>[] = [];

      const done = (err: Error | null) => {
        try {
          imap.end();
        } catch {
          /* already ended */
        }
        if (err) reject(err);
        else resolve(out);
      };

      imap.once('ready', () => {
        imap.openBox(config.folder, true, (openErr) => {
          if (openErr) return done(openErr);
          imap.search(['UNSEEN'], (searchErr, uids) => {
            if (searchErr) return done(searchErr);
            if (!uids || uids.length === 0) return done(null);
            const fetch = imap.fetch(uids, { bodies: '', struct: false });
            fetch.on('message', (msg) => {
              const chunks: Buffer[] = [];
              msg.on('body', (stream) => {
                stream.on('data', (d: Buffer) => chunks.push(d));
              });
              msg.once('end', () => {
                const raw = Buffer.concat(chunks);
                parsers.push(
                  simpleParser(raw)
                    .then((parsed) => {
                      const fromFirst = parsed.from?.value?.[0];
                      out.push({
                        messageId:
                          parsed.messageId ?? `fallback:${raw.byteLength}:${Date.now()}:${out.length}`,
                        fromEmail: fromFirst?.address ?? null,
                        fromName: fromFirst?.name ?? null,
                        subject: parsed.subject ?? null,
                        bodyText: parsed.text ?? null,
                        receivedAt: parsed.date ?? new Date(),
                      });
                    })
                    .catch(() => {
                      // Tolerate a single bad MIME; the unique Message-ID
                      // constraint means we'd re-fetch on the next poll anyway.
                    })
                );
              });
            });
            fetch.once('error', (fetchErr) => done(fetchErr));
            fetch.once('end', () => {
              Promise.all(parsers).finally(() => done(null));
            });
          });
        });
      });
      imap.once('error', (err: Error) => done(err));
      imap.connect();
    });
  }
}
