import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const children = [];
function start(args, env) {
  const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('exit', code => { for (const other of children) if (other !== child) other.kill(); process.exitCode = code || 0; });
}
start(['artifacts/api-server/node_modules/tsx/dist/cli.mjs', 'artifacts/api-server/src/index.ts'], {
  PORT: '5000', PGLITE_DATA_DIR: process.env.PGLITE_DATA_DIR || path.join(root, '.local/closet-db'), SEED_DEMO: process.env.SEED_DEMO || 'true',
});
start(['artifacts/ai-wardrobe/node_modules/vite/bin/vite.js', '--config', 'artifacts/ai-wardrobe/vite.config.ts'], { PORT: '5173', BASE_PATH: '/' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const child of children) child.kill(); });
