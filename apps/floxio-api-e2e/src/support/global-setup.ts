import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  console.log('\nSetting up e2e...\n');

  // Ensure a clean tenant fixture before any test runs.
  const seed = spawnSync('pnpm', ['db:seed'], { stdio: 'inherit' });
  if (seed.status !== 0) {
    throw new Error('db:seed failed during e2e setup');
  }

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await waitForPortOpen(port, { host });

  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
