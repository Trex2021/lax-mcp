import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..'), out = path.join(repo, 'docs/entry');
await mkdir(out, { recursive: true });
const template = JSON.parse(await readFile(path.join(repo, 'submission/offer-draft.json'), 'utf8'));
const approach = await readFile(path.join(here, 'proposal.md'), 'utf8');
await writeFile(path.join(here, 'src/generated.mjs'), 'export const template = ' + JSON.stringify(template) + ';\nexport const approach = ' + JSON.stringify(approach) + ';\n');
const result = await build({ entryPoints: [path.join(here, 'src/app.mjs')], outfile: path.join(out, 'app.js'),
  absWorkingDir: here,
  bundle: true, minify: true, format: 'esm', platform: 'browser', target: ['es2022'], legalComments: 'eof', metafile: true });
for (const name of ['index.html', 'style.css']) await copyFile(path.join(here, name), path.join(out, name));
await writeFile(path.join(repo, 'docs/.nojekyll'), '');
const licenses = new Map();
for (const name of Object.keys(result.metafile.inputs)) {
  if (!name.includes('node_modules')) continue;
  let dir = path.dirname(path.resolve(here, name));
  for (;;) {
    try {
      const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
      for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT']) {
        try { licenses.set(pkg.name, await readFile(path.join(dir, filename), 'utf8')); break; } catch {}
      }
      break;
    } catch {}
    const parent = path.dirname(dir); if (parent === dir) break; dir = parent;
  }
}
await writeFile(path.join(out, 'vendor-licenses.txt'), [...licenses].sort(([a], [b]) => a.localeCompare(b)).map(([name, text]) => name + '\n' + text).join('\n\n'));
console.log(JSON.stringify({ output: 'docs/entry', inputs: Object.keys(result.metafile.inputs).length, vendorLicenses: licenses.size }));
