import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');

await build({
  entryPoints: [path.join(packageDir, 'src/register.ts')],
  outfile: path.join(packageDir, 'dist/harmonogram-elements.js'),
  bundle: true,
  format: 'iife',
  globalName: 'HarmonogramElements',
  sourcemap: true,
  target: ['es2020'],
  legalComments: 'none',
  banner: {
    js: '/* @florasync/harmonogram-elements browser bundle */',
  },
});
