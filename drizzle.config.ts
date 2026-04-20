import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/core-domain/src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://floxio:floxio_dev_password@localhost:5434/floxio',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
