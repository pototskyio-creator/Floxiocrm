# Floxio CRM

**Что это:** CRM-платформа-движок на NestJS + Next.js + Nx monorepo. Dogfood личной фриланс-операции Ильи, затем — основа для кастомных внедрений SMB-клиентам.

**Главное правило:** это НЕ SaaS. Каждый клиент получает свой деплой (свой `apps/<client>-api` + `apps/<client>-web`) с переопределёнными провайдерами через DI. Core в `libs/core-*` — общий, не форкается.

## Архитектура

- `apps/floxio-api` — NestJS HTTP API (ваш личный инстанс)
- `apps/floxio-web` — Next.js 15 фронт (ваш личный)
- `apps/floxio-worker` — NestJS application context без HTTP, гоняет BullMQ jobs, scheduled tasks, polling каналов
- `libs/core-domain` — Drizzle schema, доменные типы, db-клиент
- `libs/core-crm` — (Д1+) NestJS модули: Clients, Projects, Stages, Reminders, Inbox
- `libs/core-integrations` — (Д8+) `IntegrationAdapter` контракт + адаптеры (imap, telegram, webhook, ...)
- `libs/core-dashboard` — (Д10) Tremor виджеты + агрегации
- `libs/ui-kit` — (Д2+) shadcn/ui обёртки
- `libs/shared-types` — Zod схемы, общие между api и web

**Добавление интеграции:**
1. Создать папку в `libs/core-integrations/adapters/<kind>/`
2. Реализовать `IntegrationAdapter` интерфейс
3. Зарегистрировать в `CoreIntegrationsModule`
4. Zod-схема config в том же модуле — UI настройки автогенерируется

**Кастом под клиента:** в `apps/<client>-api/src/<client>.module.ts` переопределить нужный провайдер через `{ provide: TOKEN, useClass: ClientImpl }`. Не трогать `libs/core-*`.

## Стек

- NestJS 11, Next.js 16 (App Router), TypeScript 5.9, Node 20+
- PostgreSQL 16 + Drizzle ORM (SQL-first, snake_case)
- Row-level tenancy: `tenant_id` + RLS (`app.tenant_id` через `SET LOCAL`)
- BullMQ + Redis для очередей
- Better Auth для auth (Д1)
- grammy для Telegram (Д7)
- node-imap + mailparser (Д8)
- Tremor для дашбордов (Д10)
- shadcn/ui + TanStack Table/Query
- Zod на всех границах
- pnpm (workspaces + nx)

## Команды

```bash
# БД + Redis
pnpm dev:db               # поднять Postgres + Redis
pnpm dev:db:stop          # остановить
pnpm dev:db:reset         # сбросить данные и поднять заново

# Drizzle
pnpm db:generate          # сгенерировать SQL миграцию из schema.ts
pnpm db:migrate           # применить миграции
pnpm db:push              # push схему без миграций (dev only)
pnpm db:studio            # Drizzle Studio UI

# Запуск
pnpm api                  # NestJS HTTP server (порт 3001)
pnpm web                  # Next.js (порт 3000)
pnpm worker               # BullMQ worker

# Nx (общие)
pnpm exec nx run-many -t build
pnpm exec nx run-many -t lint
pnpm exec nx affected -t test
pnpm exec nx graph        # visual dep graph
```

## Порты (локально)

- Postgres: `127.0.0.1:5434` (нестандартный, т.к. 5432/5433 заняты другими проектами)
- Redis: `127.0.0.1:6379`
- API: `3001`
- Web: `3000`

## Обязательные правила

1. **Все запросы к БД — через Repository**, не напрямую через Drizzle. Repository инжектит `tenant_id` и `SET LOCAL app.tenant_id` на транзакцию.
2. **Все интеграции — через `IntegrationAdapter`**, никаких прямых вызовов SDK из контроллеров/сервисов.
3. **Все таблицы — с `tenant_id` и RLS-политикой**, даже если сейчас один tenant.
4. **Даты в UTC в БД**, timezone для рендера из `users.timezone`.
5. **Секреты в `.env`** (не в git), config интеграций — шифруется AES-GCM в `integration_instances.config`.
6. **Zod на границах:** API-контроллеры, webhook-приёмники, чтение `integration_instances.config`.
7. **Не создавать файлы в `libs/core-*` с именем клиента** (acme и т.п.) — это всегда в `apps/<client>-*` или `libs/<client>-custom`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
