import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot, GrammyError, HttpError } from 'grammy';
import { z } from 'zod';
import type { DeliveryPayload, IntegrationAdapter } from '../../core/adapter.contract.js';
import { IntegrationRegistry } from '../../core/integration-registry.service.js';

// Outbound-only Telegram adapter. Config carries the bot token and a default
// recipient chat id — that's enough to fire reminders into the owner's chat
// without user-level linking (which is a later feature).
const configSchema = z.object({
  botToken: z.string().min(20).max(200),
  chatId: z.string().min(1).max(64),
});
type TelegramConfig = z.infer<typeof configSchema>;

@Injectable()
export class TelegramAdapter implements IntegrationAdapter<TelegramConfig>, OnModuleInit {
  readonly kind = 'telegram';
  readonly displayName = 'Telegram bot';
  readonly configSchema = configSchema;

  private readonly logger = new Logger(TelegramAdapter.name);
  // grammy's Bot is stateful (HTTP client + optional update polling). We want
  // one Bot per unique token across the process — caching avoids reopening
  // sockets on every delivery and keeps grammy's rate-limit tracking warm.
  private readonly bots = new Map<string, Bot>();

  constructor(private readonly registry: IntegrationRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  private botFor(token: string): Bot {
    let bot = this.bots.get(token);
    if (!bot) {
      bot = new Bot(token);
      this.bots.set(token, bot);
    }
    return bot;
  }

  async deliver(config: TelegramConfig, payload: DeliveryPayload): Promise<void> {
    const text = payload.body ? `*${payload.title}*\n\n${payload.body}` : `*${payload.title}*`;
    try {
      await this.botFor(config.botToken).api.sendMessage(config.chatId, text, {
        parse_mode: 'Markdown',
      });
      this.logger.log(`telegram → chat=${config.chatId} title="${payload.title}"`);
    } catch (err) {
      // Normalize grammy's error types so the worker logs useful context.
      if (err instanceof GrammyError) {
        throw new Error(`Telegram API ${err.error_code}: ${err.description}`);
      }
      if (err instanceof HttpError) {
        throw new Error(`Telegram network error: ${err.message}`);
      }
      throw err;
    }
  }

  async check(config: TelegramConfig): Promise<{ ok: boolean; detail?: string }> {
    try {
      const me = await this.botFor(config.botToken).api.getMe();
      return { ok: true, detail: `@${me.username}` };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }
}
