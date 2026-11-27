// Start `npm run dev -- --port 4174` first. Uses the same renderer as local GLB previews.
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync('src/assets/forest-catalog.json', 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto(process.env.THUMBNAIL_ORIGIN || 'http://127.0.0.1:4174');
  const dir = 'public/packs/forest-v1/thumbnails';
  mkdirSync(dir, { recursive: true });
  for (const entry of catalog.assets) {
    const png = await page.evaluate(async entry => {
      const { renderModelThumbnail } = await import('/src/assets/thumbnail.js');
      const response = await fetch(`/packs/forest-v1/${entry.file}`);
      if (!response.ok) throw Error('Missing GLB: ' + entry.file);
      return renderModelThumbnail(new File([await response.blob()], entry.file));
    }, entry);
    writeFileSync(`${dir}/${entry.id}.png`, Buffer.from(png.split(',')[1], 'base64'));
    console.log(entry.id);
  }
} finally { await browser.close(); }
