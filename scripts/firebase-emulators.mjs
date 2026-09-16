import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const env = { ...process.env };
let nodeBinary = process.execPath;
const originalPath = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
// Use an installed Java/Node runtime; portable Windows runtimes are optional.
if (process.platform === 'win32' && env.LOCALAPPDATA) {
  const directory = join(env.LOCALAPPDATA, 'ash-oath-dev');
  if (existsSync(directory)) {
    const entries = readdirSync(directory);
    const java = entries.find(
      (name) => name.startsWith('jdk-21') && existsSync(join(directory, name, 'bin', 'java.exe')),
    );
    const node = entries.find(
      (name) => name.startsWith('node-v22.') && existsSync(join(directory, name, 'node.exe')),
    );
    if (!env.JAVA_HOME && java) env.JAVA_HOME = join(directory, java);
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
    env.Path = [
      node && join(directory, node),
      env.JAVA_HOME && join(env.JAVA_HOME, 'bin'),
      originalPath,
    ]
      .filter(Boolean)
      .join(';');
    if (node) nodeBinary = join(directory, node, 'node.exe');
  }
}
const testing = process.argv.includes('--test');
const testCommand = 'npm run test:backend && npm run test:rules && npm run test:ui';
const args = testing
  ? [
      'emulators:exec',
      '--only',
      'auth,firestore,functions',
      '--project',
      'demo-ash-and-oath',
      testCommand,
    ]
  : ['emulators:start', '--only', 'auth,firestore,functions', '--project', 'demo-ash-and-oath'];
const cli = [
  join(process.cwd(), 'node_modules/firebase-tools/lib/bin/firebase.js'),
  env.APPDATA && join(env.APPDATA, 'npm/node_modules/firebase-tools/lib/bin/firebase.js'),
].find((path) => path && existsSync(path));
const child = cli
  ? spawn(nodeBinary, [cli, ...args], { env, stdio: 'inherit' })
  : spawn('firebase', args, { env, stdio: 'inherit' });
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
