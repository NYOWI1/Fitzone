import { spawn } from 'node:child_process';

const API_PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const shouldExposeHost = process.argv.includes('--host');

let isStopping = false;
const children = [];

function spawnCommand(name, command, args, env = {}, cwd = process.cwd()) {
  const child = spawn(command, args, {
    cwd,
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
spawnCommand(
  'server',
  'npm',
  ['run', 'dev'],
  {
    PORT: String(API_PORT),
    FITZONE_API_ONLY: 'true'
  },
  new URL('../backend', import.meta.url)
);

// Start Vite
spawnCommand(
  'client',
  'npm',
  ['run', 'dev', '--', ...(shouldExposeHost ? ['--host', '0.0.0.0'] : [])],
  {
    API_PORT: String(API_PORT)
  },
  new URL('../frontend', import.meta.url)
);

process.on('SIGINT', () => {
  stopChildren();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(0);
});
