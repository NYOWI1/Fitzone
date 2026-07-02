import { spawn } from "node:child_process";

const commands = [
  ["server", "npm", ["run", "server:dev"]],
  ["client", "npm", ["run", "client:dev"]],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code) => {
    if (code) {
      process.exitCode = code;
      stopChildren();
    }
  });

  return child;
});

let isStopping = false;

function stopChildren() {
  if (isStopping) {
    return;
  }

  isStopping = true;

  children.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});
