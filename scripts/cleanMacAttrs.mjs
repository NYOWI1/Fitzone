import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  process.exit(0);
}

const targets = [
  "index.html",
  "postcss.config.js",
  "vite.config.js",
  "package.json",
  "package-lock.json",
  "src",
  "server",
  "scripts",
  "public",
  "node_modules/vite",
  "node_modules/@vitejs",
  "node_modules/@tailwindcss",
  "node_modules/tailwindcss",
  "node_modules/lightningcss",
  "node_modules/lightningcss-darwin-arm64",
];

spawnSync("xattr", ["-dr", "com.apple.provenance", ...targets], {
  stdio: "ignore",
});
