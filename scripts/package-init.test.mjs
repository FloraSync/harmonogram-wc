import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { initializeNpmProject, renderNpmrc } from './package-init-lib.mjs';

test('renderNpmrc creates scoped npm auth config from env token', () => {
  const npmrc = renderNpmrc({ token: 'sekret-token' });

  assert.equal(
    npmrc,
    [
      '@florasync:registry=https://registry.npmjs.org/',
      '//registry.npmjs.org/:_authToken=sekret-token',
      ''
    ].join('\n')
  );
});

test('renderNpmrc can opt in to always-auth', () => {
  const npmrc = renderNpmrc({ token: 'sekret-token', alwaysAuth: true });

  assert.match(npmrc, /always-auth=true/);
});

test('initializeNpmProject reads .env and writes .npmrc', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmonogram-package-init-'));
  await fs.writeFile(path.join(tempDir, '.env'), 'NPM_TOKEN=from-dotenv\n');

  const result = await initializeNpmProject({ cwd: tempDir });
  const npmrc = await fs.readFile(path.join(tempDir, '.npmrc'), 'utf8');

  assert.equal(result.tokenSource, 'NPM_TOKEN');
  assert.equal(result.npmrcPath, path.join(tempDir, '.npmrc'));
  assert.match(npmrc, /_authToken=from-dotenv/);
});

test('initializeNpmProject prefers NODE_AUTH_TOKEN over NPM_TOKEN', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmonogram-package-init-'));
  await fs.writeFile(path.join(tempDir, '.env'), 'NPM_TOKEN=from-npm\nNODE_AUTH_TOKEN=from-node-auth\n');

  const result = await initializeNpmProject({ cwd: tempDir });
  const npmrc = await fs.readFile(path.join(tempDir, '.npmrc'), 'utf8');

  assert.equal(result.tokenSource, 'NODE_AUTH_TOKEN');
  assert.match(npmrc, /_authToken=from-node-auth/);
  assert.doesNotMatch(npmrc, /_authToken=from-npm/);
});

test('initializeNpmProject falls back to process.env when .env is missing', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmonogram-package-init-'));

  const result = await initializeNpmProject({
    cwd: tempDir,
    processEnv: { NODE_AUTH_TOKEN: 'from-process-env' }
  });
  const npmrc = await fs.readFile(path.join(tempDir, '.npmrc'), 'utf8');

  assert.equal(result.tokenSource, 'process.env.NODE_AUTH_TOKEN');
  assert.match(npmrc, /_authToken=from-process-env/);
});

test('initializeNpmProject preserves unrelated existing .npmrc lines', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmonogram-package-init-'));
  await fs.writeFile(path.join(tempDir, '.env'), 'NPM_TOKEN=from-dotenv\n');
  await fs.writeFile(path.join(tempDir, '.npmrc'), 'save-exact=true\nlegacy-peer-deps=true\nalways-auth=false\n');

  await initializeNpmProject({ cwd: tempDir });
  const npmrc = await fs.readFile(path.join(tempDir, '.npmrc'), 'utf8');

  assert.match(npmrc, /save-exact=true/);
  assert.match(npmrc, /legacy-peer-deps=true/);
  assert.match(npmrc, /always-auth=false/);
  assert.match(npmrc, /_authToken=from-dotenv/);
});

test('initializeNpmProject throws when the .env file has no npm token', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harmonogram-package-init-'));
  await fs.writeFile(path.join(tempDir, '.env'), 'HELLO=world\n');

  await assert.rejects(
    () => initializeNpmProject({ cwd: tempDir }),
    /Expected NODE_AUTH_TOKEN or NPM_TOKEN/
  );
});
