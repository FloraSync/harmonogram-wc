import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SCOPE = '@florasync';
const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

export function parseDotEnv(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function resolveToken(envValues, processEnv = process.env) {
  if (envValues.NODE_AUTH_TOKEN || processEnv.NODE_AUTH_TOKEN) {
    return {
      token: envValues.NODE_AUTH_TOKEN ?? processEnv.NODE_AUTH_TOKEN,
      tokenSource: envValues.NODE_AUTH_TOKEN ? 'NODE_AUTH_TOKEN' : 'process.env.NODE_AUTH_TOKEN'
    };
  }

  if (envValues.NPM_TOKEN || processEnv.NPM_TOKEN) {
    return {
      token: envValues.NPM_TOKEN ?? processEnv.NPM_TOKEN,
      tokenSource: envValues.NPM_TOKEN ? 'NPM_TOKEN' : 'process.env.NPM_TOKEN'
    };
  }

  throw new Error('Expected NODE_AUTH_TOKEN or NPM_TOKEN in .env or process.env');
}

export function renderNpmrc({
  token,
  scope = DEFAULT_SCOPE,
  registry = DEFAULT_REGISTRY,
  alwaysAuth = false
}) {
  if (!token) {
    throw new Error('renderNpmrc requires a token');
  }

  if (/\r|\n/.test(token)) {
    throw new Error('npm auth token must be a single line');
  }

  const normalizedRegistry = registry.endsWith('/') ? registry : `${registry}/`;
  const registryHost = normalizedRegistry.replace(/^https?:/, '');
  const lines = [
    `${scope}:registry=${normalizedRegistry}`,
    `${registryHost}:_authToken=${token}`
  ];

  if (alwaysAuth) {
    lines.push('always-auth=true');
  }

  return `${lines.join('\n')}\n`;
}

export function mergeNpmrc(existingContent, managedContent) {
  const managedKeys = new Set(
    managedContent
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split('=')[0])
  );

  const preservedLines = existingContent
    .split(/\r?\n/)
    .filter((line) => line && !managedKeys.has(line.split('=')[0]));

  return `${[...preservedLines, ...managedContent.trimEnd().split(/\r?\n/)].join('\n')}\n`;
}

export async function initializeNpmProject({
  cwd = process.cwd(),
  envPath = path.join(cwd, '.env'),
  npmrcPath = path.join(cwd, '.npmrc'),
  scope = DEFAULT_SCOPE,
  registry = DEFAULT_REGISTRY,
  alwaysAuth = false,
  processEnv = process.env
} = {}) {
  let envContent = '';

  try {
    envContent = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }

  const envValues = parseDotEnv(envContent);
  const { token, tokenSource } = resolveToken(envValues, processEnv);
  const managedNpmrcContent = renderNpmrc({ token, scope, registry, alwaysAuth });

  let existingNpmrcContent = '';
  try {
    existingNpmrcContent = await fs.readFile(npmrcPath, 'utf8');
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }

  const npmrcContent = mergeNpmrc(existingNpmrcContent, managedNpmrcContent);
  await fs.writeFile(npmrcPath, npmrcContent);

  return {
    envPath,
    npmrcPath,
    tokenSource,
    scope,
    registry,
    alwaysAuth
  };
}
