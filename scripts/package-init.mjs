#!/usr/bin/env node

import path from 'node:path';

import { initializeNpmProject } from './package-init-lib.mjs';

function requireValue(flag, value) {
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--scope') {
      options.scope = requireValue(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--registry') {
      options.registry = requireValue(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--env-file') {
      options.envPath = path.resolve(requireValue(arg, argv[index + 1]));
      index += 1;
      continue;
    }

    if (arg === '--npmrc') {
      options.npmrcPath = path.resolve(requireValue(arg, argv[index + 1]));
      index += 1;
      continue;
    }

    if (arg === '--always-auth') {
      options.alwaysAuth = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await initializeNpmProject(options);

  console.log(`Wrote ${result.npmrcPath}`);
  console.log(`Loaded token from ${result.tokenSource}`);
  console.log(`Scope: ${result.scope}`);
  console.log(`Registry: ${result.registry}`);
  console.log(`Always auth: ${result.alwaysAuth ? 'enabled' : 'disabled'}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
