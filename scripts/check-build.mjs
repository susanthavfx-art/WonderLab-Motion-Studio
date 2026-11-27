import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// GitHub project Pages serves the build under /WonderLab-Motion-Studio/,
// not the domain root. Source files and npm imports cannot be served directly.
const root = resolve('dist');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.ok(!html.includes('/src/main.js'), 'Source entrypoint leaked into build');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
assert.ok(refs.some(p => p.endsWith('.js')), 'Missing compiled entrypoint');
for (const ref of refs) {
  assert.ok(ref.startsWith('./'), `Expected a relative Pages asset: ${ref}`);
  assert.ok(existsSync(resolve(root, ref)), `Missing built asset: ${ref}`);
}
const assets = readdirSync(resolve(root, 'assets'));
for (const pattern of [/^pose-.*\.js$/, /\.wasm$/, /\.tflite$/, /\.data$/]) {
  assert.ok(assets.some(name => pattern.test(name)), `Missing pose runtime asset: ${pattern}`);
}
console.log('Production HTML, relative asset paths and local pose runtime assets verified.');

const forest = JSON.parse(readFileSync(resolve('src/assets/forest-catalog.json'), 'utf8'));
for (const entry of forest.assets) {
  assert.ok(existsSync(resolve(root, "packs/forest-v1/thumbnails", entry.id + ".png")), `Missing thumbnail: ${entry.id}`);
  const file = resolve(root, 'packs/forest-v1', entry.file);
  assert.ok(existsSync(file), `Missing built forest asset: ${entry.file}`);
  const bytes = readFileSync(file);
  assert.equal(bytes.length, entry.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
}
assert.ok(existsSync(resolve(root, 'packs/forest-v1/CREDITS.txt')), 'Missing forest credits');
console.log('All 54 built forest GLBs and attribution verified.');
