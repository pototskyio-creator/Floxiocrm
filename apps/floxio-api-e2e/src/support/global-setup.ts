import 'dotenv/config';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

// Stash the worker handle on globalThis so global-teardown can kill it.
declare global {
  // eslint-disable-next-line no-var
  var __WORKER_PROC__: ChildProcess | undefined;
}

module.exports = async function () {
  console.log('\nSetting up e2e...\n');

  const seed = spawnSync('pnpm', ['db:seed'], { stdio: 'inherit' });
  if (seed.status !== 0) {
    throw new Error('db:seed failed during e2e setup');
  }

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await waitForPortOpen(port, { host });

  // Spawn the worker as a subprocess. It shares Redis + DB with the API so
  // jobs enqueued by the API (via the reminders queue) are consumed here.
  const worker = spawn('node', ['apps/floxio-worker/dist/main.js'], {
    stdio: 'inherit',
    env: process.env,
  });
  worker.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      // Surface unexpected exits; the test run will fail if worker dies early.
      // eslint-disable-next-line no-console
      console.error(`Worker exited with code ${code}`);
    }
  });
  globalThis.__WORKER_PROC__ = worker;
  // Give the worker a moment to attach to Redis.
  await new Promise((r) => setTimeout(r, 800));

  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
