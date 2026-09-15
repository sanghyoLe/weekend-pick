import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

// Reuses the original carousel's Playwright/Chrome export path; no new package.
const out = dirname(fileURLToPath(import.meta.url));
const source = pathToFileURL(join(out, 'index.html')).href;
const browser = await chromium.launch({ channel: 'chrome' });
const settle = page => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.decode()));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${source}?export`);
  await page.waitForSelector('html[data-ready="true"]');
  await settle(page);
  const checks = await page.evaluate(() => ({
    fonts: document.fonts.check('850 92px "Noto Sans KR Variable"', '이번 주말') && document.fonts.check('700 32px "Gowun Batang"', '주말픽'),
    contrast: (() => {
      const context = document.createElement('canvas').getContext('2d');
      const tokens = getComputedStyle(document.documentElement);
      const luminance = token => {
        context.fillStyle = tokens.getPropertyValue(token).trim();
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
          const channel = value / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return .2126 * r + .7152 * g + .0722 * b;
      };
      return [['--color-ink', '--color-paper'], ['--color-muted', '--color-paper'], ['--color-dark-muted', '--color-ink']].map(([text, background]) => {
        const a = luminance(text), b = luminance(background);
        return { text, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
      });
    })(),
    images: [...document.images].map(img => {
      const box = img.getBoundingClientRect();
      return { src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, ratioError: Math.abs(box.width / box.height - img.naturalWidth / img.naturalHeight), fit: getComputedStyle(img).objectFit };
    }),
    cards: [...document.querySelectorAll('.card')].map(card => {
      const box = card.getBoundingClientRect();
      const outside = [...card.querySelectorAll('header,h1,h2,p,figure,figcaption,table,.poster-info,.footer')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.left < box.left - .5 || r.right > box.right + .5 || r.top < box.top - .5 || r.bottom > box.bottom + .5;
      }).map(el => el.className || el.tagName);
      const footer = card.querySelector('.footer').getBoundingClientRect();
      const prior = card.querySelector('.footer').previousElementSibling.getBoundingClientRect();
      return { id: card.id, width: box.width, height: box.height, outside, footerOverlap: prior.bottom > footer.top + .5 };
    })
  }));
  assert.equal(checks.fonts, true);
  for (const pair of checks.contrast) assert.ok(pair.ratio >= 4.5, `Text contrast: ${pair.text}`);
  assert.equal(checks.cards.length, 7);
  for (const img of checks.images) {
    assert.equal(img.loaded, true, img.src);
    assert.ok(img.ratioError < .001, `Image proportions must be preserved: ${img.src}`);
    assert.notEqual(img.fit, 'cover', 'No cropping of source imagery');
  }
  for (const card of checks.cards) {
    assert.equal(card.width, 1080);
    assert.equal(card.height, 1350);
    assert.deepEqual(card.outside, [], `${card.id} content leaves the card`);
    assert.equal(card.footerOverlap, false, `${card.id} content overlaps footer`);
    const target = join(out, `${card.id}.jpg`);
    await page.locator(`#${card.id}`).screenshot({ path: target, type: 'jpeg', quality: 96 });
    assert.ok((await stat(target)).size < 8 * 1024 * 1024);
  }
  const caption = await readFile(join(out, 'caption.txt'), 'utf8');
  assert.ok([...caption].length <= 2200);
  // Preview the actual card composition at mobile widths, not a different layout.
  await page.goto(source);
  checks.responsive = [];
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 960 });
    await settle(page);
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      cardsInsideViewport: [...document.querySelectorAll('.card')].every(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + .5;
      })
    }));
    assert.ok(result.scrollWidth <= width, `Horizontal scroll at ${width}px`);
    assert.equal(result.cardsInsideViewport, true);
    checks.responsive.push(result);
    await page.locator('.sheet').first().screenshot({path:join(out, `qa-${width}.png`)});
  }
  await page.addStyleTag({ content: '#cards{grid-template-columns:repeat(4,minmax(0,270px));gap:16px;padding:24px;width:1176px}.sheet{width:270px}' });
  await page.setViewportSize({width:1176,height:740});
  await settle(page);
  await page.screenshot({path:join(out,'preview.jpg'),type:'jpeg',quality:96,fullPage:true});
  assert.deepEqual(errors, []);
  checks.captionCharacters = [...caption].length;
  checks.runtimeErrors = errors;
  await writeFile(join(out, 'qa.json'), JSON.stringify(checks, null, 2) + '\n');
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}
