import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3100");
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const canvas = document.createElement("canvas");
    canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext("2d");
    function rgb(name) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = style.getPropertyValue(name).trim();
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    }
    function luminance(color) {
      const values = color.map(channel => { const n = channel / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    }
    const pairs = [
      ["--color-ink", "--color-paper"], ["--color-muted", "--color-paper"],
      ["--color-muted", "--color-surface"], ["--color-muted", "--color-accent-soft"],
      ["--color-accent", "--color-accent-soft"], ["--color-on-accent", "--color-accent"],
      ["--color-stamp", "--color-paper"], ["--color-focus", "--color-paper"],
    ];
    return {
      contrast: pairs.map(([fg, bg]) => { const a = luminance(rgb(fg)), b = luminance(rgb(bg)); return { fg, bg, ratio: Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100 }; }),
      primaryButtonInFold: document.querySelector(".search-submit").getBoundingClientRect().bottom <= 800,
    };
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.contrast.some(pair => pair.ratio < 4.5) || !result.primaryButtonInFold) process.exitCode = 1;
} finally { await browser.close(); }
