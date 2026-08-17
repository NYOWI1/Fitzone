import { spawn } from 'node:child_process';

const API_PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const shouldExposeHost = process.argv.includes('--host');

let isStopping = false;
const children = [];

function spawnCommand(name, command, args, env = {}) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...env
    },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  children.push(child);

  child.on('error', (error) => {
    console.error(`[${name}] Failed to start: ${error.message}`);
    stopChildren();
  });

  child.on('exit', (code, signal) => {
    if (isStopping) return;

    console.error(
      `[${name}] exited${signal ? ` from ${signal}` : ` with code ${code}`}`
    );

    stopChildren();
  });

  return child;
}

function stopChildren() {
  if (isStopping) return;

  isStopping = true;

  children.forEach((child) => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  });
}

// Start backend
spawnCommand('server', 'node', ['server/index.js'], {
  PORT: String(API_PORT),
  FITZONE_API_ONLY: 'true'
});

// Start Vite
spawnCommand(
  'client',
  'node',
  [
    './node_modules/vite/bin/vite.js',
    ...(shouldExposeHost ? ['--host', '0.0.0.0'] : [])
  ],
  {
    API_PORT: String(API_PORT)
  }
);

process.on('SIGINT', () => {
  stopChildren();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(0);
});
