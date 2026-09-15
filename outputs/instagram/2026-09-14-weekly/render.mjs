import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const out = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(join(out, 'index.html')).href);
  await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
  const checks = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    return {
      fontLoaded: document.fonts.check('700 80px "Gowun Batang"') && document.fonts.check('32px "Noto Sans KR Variable"'),
      cards: cards.map(card => {
        const box = card.getBoundingClientRect();
        const outside = [...card.querySelectorAll('h1,h2,p,.facts,.kicker,.top,.footer,.picklist,.comparison,.week')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.left < box.left || r.right > box.right || r.top < box.top || r.bottom > box.bottom;
        }).map(el => el.className || el.tagName);
        const footer = card.querySelector('.footer').getBoundingClientRect();
        const prior = card.querySelector('.footer').previousElementSibling.getBoundingClientRect();
        return { id: card.id, width: box.width, height: box.height, outside, footerOverlap: prior.bottom > footer.top };
      })
    };
  });
  assert.deepEqual(errors, []);
  assert.equal(checks.fontLoaded, true, 'Korean fonts must load');
  assert.equal(checks.cards.length, 7);
  for (const check of checks.cards) {
    assert.equal(check.width, 1080);
    assert.equal(check.height, 1350);
    assert.deepEqual(check.outside, [], `${check.id} content leaves the card`);
    assert.equal(check.footerOverlap, false, `${check.id} content overlaps the footer`);
    const target = join(out, `${check.id}.jpg`);
    await page.locator(`#${check.id}`).screenshot({ path: target, type: 'jpeg', quality: 95 });
    assert.ok((await stat(target)).size < 8 * 1024 * 1024);
  }
  await page.addStyleTag({content: `#cards{display:grid;grid-template-columns:repeat(4,270px);gap:16px;padding:24px;width:1176px;justify-content:start}.card{transform:scale(.25);transform-origin:top left;margin-right:-810px;margin-bottom:-1012.5px}body{width:1176px}`});
  await page.setViewportSize({ width: 1176, height: 739 });
  await page.screenshot({ path: join(out, 'preview.jpg'), type: 'jpeg', quality: 95, fullPage: true });
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}
