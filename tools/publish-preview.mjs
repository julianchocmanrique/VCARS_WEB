import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = path.resolve(root, '../vcars-api');
const repo = 'julianchocmanrique/VCARS_WEB';
const branch = 'codex/vcars-fixed-preview';
const stateDir = path.join(os.homedir(), '.local/share/vcars-fixed-preview');
fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
const configPath = path.join(stateDir, 'config.json');
const initialize = process.argv.includes('--initialize');
if (process.argv.slice(2).some(arg => arg !== '--initialize')) throw new Error('Only --initialize is supported.');
let config;
if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
else {
  if (!initialize) throw new Error('The first deployment requires --initialize.');
  config = { packageKey: randomBytes(32).toString('hex'), accessKey: randomBytes(32).toString('hex'), origin: 'https://www.viralcoproducciones.com' };
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
}
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
const gh = args => JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8' }));
console.log('Checking frontend and API before publishing.');
run('npm', ['test']); run('npm', ['run', 'lint']); run('npm', ['run', 'build']);
run('npm', ['run', 'build'], apiRoot);
const tests = fs.readdirSync(path.join(apiRoot, 'src')).filter(name => name.endsWith('.test.ts')).map(name => 'src/' + name);
run('node', ['--import', 'tsx', '--test', ...tests], apiRoot);
run('node', ['--test', 'deploy/preview/gateway.test.mjs']);
run('python3', ['deploy/preview/nginx_test.py']);
const release = 'vcars-preview-' + new Date().toISOString().replace(/[^0-9]/g, '') + '-' + randomBytes(3).toString('hex');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vcars-publish-')); fs.chmodSync(work, 0o700);
const stage = path.join(work, 'package'); fs.mkdirSync(stage);
const copy = (from, to, names) => {
  fs.mkdirSync(to, { recursive: true });
  for (const name of names) fs.cpSync(path.join(from, name), path.join(to, name), { recursive: true, filter: src => !src.endsWith('.DS_Store') && !src.includes('__pycache__') });
};
copy(root, path.join(stage, 'web'), ['src', 'public', 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs', 'Dockerfile', '.dockerignore']);
copy(apiRoot, path.join(stage, 'api'), ['src', 'prisma', 'package.json', 'package-lock.json', 'tsconfig.json', 'Dockerfile', '.dockerignore']);
copy(path.join(root, 'deploy/preview'), path.join(stage, 'deploy'), ['compose.yml', 'gateway.mjs', 'nginx.py']);
fs.mkdirSync(path.join(stage, 'bootstrap'));
if (initialize) {
  const dump = path.join(stage, 'bootstrap/database.dump');
  const fd = fs.openSync(dump, 'w', 0o600);
  try { execFileSync('docker', ['exec', 'vcars-api-db-1', 'pg_dump', '-U', 'vcars', '-d', 'vcars', '-Fc', '--no-owner', '--no-acl'], { stdio: ['ignore', fd, 'inherit'] }); }
  finally { fs.closeSync(fd); }
  fs.cpSync(path.join(apiRoot, 'uploads'), path.join(stage, 'bootstrap/uploads'), { recursive: true });
  fs.writeFileSync(path.join(stage, 'bootstrap/review-key'), config.accessKey, { mode: 0o600 });
}
const archive = path.join(work, 'release.tar.gz');
run('tar', ['-czf', archive, '-C', stage, 'web', 'api', 'deploy', 'bootstrap']);
const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(config.packageKey, 'hex'), iv);
const ciphertext = Buffer.concat([cipher.update(fs.readFileSync(archive)), cipher.final()]);
const encrypted = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
const encryptedPath = path.join(work, 'release.enc'); fs.writeFileSync(encryptedPath, encrypted, { mode: 0o600 });
const manifest = { release, sha256: createHash('sha256').update(encrypted).digest('hex'), origin: config.origin, initializedFromLocal: initialize };
// Only encrypted packages enter the public repo's release storage. No passwords,
// environment files, database exports or photos are committed to source control.
execFileSync('gh', ['secret', 'set', 'VCARS_PREVIEW_PACKAGE_KEY', '--repo', repo], { input: config.packageKey, stdio: ['pipe', 'inherit', 'inherit'] });
run('gh', ['release', 'create', release, encryptedPath, '--repo', repo, '--target', branch, '--prerelease', '--title', 'VCARS private preview update', '--notes', 'Encrypted deployment package. Requires the private deployment key; no plaintext application data is published.']);
const base = gh([`repos/${repo}/git/ref/heads/${branch}`]).object.sha;
const tree = gh([`repos/${repo}/git/commits/${base}`]).tree.sha;
const files = ['.github/workflows/fixed-preview.yml', ...['apply.sh', 'compose.yml', 'decrypt.mjs', 'gateway.mjs', 'nginx.py', 'gateway.test.mjs', 'nginx_test.py'].map(name => 'deploy/preview/' + name), 'tools/publish-preview.mjs'];
const entries = [];
for (const name of files) {
  const blob = gh([`repos/${repo}/git/blobs`, '--method', 'POST', '-f', 'encoding=base64', '-f', 'content=' + fs.readFileSync(path.join(root, name)).toString('base64')]);
  entries.push({ path: name, mode: '100644', type: 'blob', sha: blob.sha });
}
const blob = gh([`repos/${repo}/git/blobs`, '--method', 'POST', '-f', 'encoding=base64', '-f', 'content=' + Buffer.from(JSON.stringify(manifest, null, 2)).toString('base64')]);
entries.push({ path: 'deploy/preview/release.json', mode: '100644', type: 'blob', sha: blob.sha });
const jsonApi = (url, obj) => JSON.parse(execFileSync('gh', ['api', url, '--method', 'POST', '--input', '-'], { input: JSON.stringify(obj), encoding: 'utf8' }));
const nextTree = jsonApi(`repos/${repo}/git/trees`, { base_tree: tree, tree: entries });
const commit = jsonApi(`repos/${repo}/git/commits`, { message: '[publish-preview] Publish validated isolated VCARS update', tree: nextTree.sha, parents: [base] });
execFileSync('gh', ['api', `repos/${repo}/git/refs/heads/${branch}`, '--method', 'PATCH', '--input', '-'], { input: JSON.stringify({ sha: commit.sha, force: false }), stdio: ['pipe', 'ignore', 'inherit'] });
fs.writeFileSync(path.join(stateDir, 'last-publish.json'), JSON.stringify({ ...manifest, commit: commit.sha, work }), { mode: 0o600 });
fs.writeFileSync(path.join(stateDir, 'review-link.json'), JSON.stringify({ url: `${config.origin}/vcars/acceso/${config.accessKey}`, origin: config.origin }), { mode: 0o600 });
console.log('Deployment submitted:', release, 'commit', commit.sha);
console.log('Wait for VCARS Fixed Preview to succeed before sharing the saved review link.');
