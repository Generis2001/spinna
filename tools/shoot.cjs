#!/usr/bin/env node
/**
 * Screenshot helper for visual validation.
 * Usage: node tools/shoot.cjs <fileOrUrl> <outPng> [width] [height] [dpr] [delayMs] [bg]
 * Also supports a JSON job file:  node tools/shoot.cjs --jobs jobs.json
 */
const puppeteer = require('/home/generisx/node_modules/puppeteer');
const path = require('path');

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

function toUrl(fileOrUrl) {
  if (/^https?:|^file:/.test(fileOrUrl)) return fileOrUrl;
  return 'file://' + path.resolve(fileOrUrl);
}

async function shootOne(page, job) {
  const { url, out, width = 400, height = 300, dpr = 2, delay = 600, emulateReducedMotion } = job;
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  if (emulateReducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  } else {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  }
  await page.goto(toUrl(url), { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, delay));
  await page.screenshot({ path: out });
  console.log('  ✓', out);
}

(async () => {
  const args = process.argv.slice(2);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  try {
    if (args[0] === '--jobs') {
      const jobs = require(path.resolve(args[1]));
      for (const job of jobs) await shootOne(page, job);
    } else {
      const [fileOrUrl, out, width, height, dpr, delay] = args;
      await shootOne(page, {
        url: fileOrUrl,
        out,
        width: width ? +width : undefined,
        height: height ? +height : undefined,
        dpr: dpr ? +dpr : undefined,
        delay: delay ? +delay : undefined,
      });
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('shoot FAIL:', e.message);
  process.exit(1);
});
