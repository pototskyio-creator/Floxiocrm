import { killPort } from '@nx/node/utils';
import type { ChildProcess } from 'node:child_process';
/* eslint-disable */

declare global {
  // eslint-disable-next-line no-var
  var __WORKER_PROC__: ChildProcess | undefined;
}

module.exports = async function () {
  const worker = globalThis.__WORKER_PROC__;
  if (worker && !worker.killed) {
    worker.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    if (!worker.killed) worker.kill('SIGKILL');
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await killPort(port);
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
