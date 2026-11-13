// Optional real-browser checks; not part of bin/check's dependency-free suite.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderDecision } from './build.mjs';

const modulePath = process.env.DECISION_CARD_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : 'playwright');
const fixture = JSON.parse(await readFile(new URL('example.json', import.meta.url), 'utf8'));

test('standalone and sandboxed HTML: keyboard, replies, fallback, themes and narrow layout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'decision-card-browser-'));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.DECISION_CARD_CHROMIUM ? { executablePath: process.env.DECISION_CARD_CHROMIUM } : {}),
      args: ['--disable-background-networking']
    });
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, offline: true });
    const page = await context.newPage();
    const errors = [];
    const network = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (/^https?:/.test(request.url())) network.push(request.url()); });
    const data = structuredClone(fixture);
    data.options[0].summary = '</script><img src=x onerror="window.__decisionXss=true">';
    const html = await renderDecision(data);
    const output = join(dir, 'decision.html');
    await writeFile(output, html);

    // Use file://, not a web server or a privileged application window.
    await page.goto(pathToFileURL(output).href);
    await page.locator('#card').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.option').count(), 3);
    assert.equal(await page.locator('input:checked').count(), 0);
    assert.equal(await page.locator('#copy').isDisabled(), true);
    assert.equal(await page.locator('#summary-0').textContent(), data.options[0].summary);
    assert.equal(await page.locator('#summary-0 img').count(), 0);
    assert.equal(await page.evaluate(() => window.__decisionXss), undefined);
    await page.locator('#option-0').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#option-1').isChecked(), true);
    assert.match(await page.locator('#reply').inputValue(), /option: hosted-search/);
    await page.locator('#notes').fill('Please compare costs first.');
    assert.match(await page.locator('#reply').inputValue(), /compare costs first/);
    await page.locator('#select-reply').click();
    assert.ok(await page.locator('#reply').evaluate((node) => node.selectionEnd > node.selectionStart));
    await page.locator('#clear').click();
    assert.equal(await page.locator('input:checked').count(), 0);
    assert.equal(await page.locator('#reply').inputValue(), '');

    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: 'dark' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.addStyleTag({ content: ':root { --background: rgb(12, 34, 56); --foreground: rgb(220, 230, 240); }' });
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(12, 34, 56)');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(220, 230, 240)');

    // Match the key Orca boundary: opaque-origin iframe with scripts only.
    // This does not emulate Orca's parser, file RPC, theme bridge or auto-height.
    await page.goto('about:blank');
    await page.setContent('<iframe title="Decision experiment" sandbox="allow-scripts" style="width:100%;height:1800px;border:0"></iframe>');
    await page.locator('iframe').evaluate((frame, source) => { frame.srcdoc = source; }, html);
    const frame = page.frameLocator('iframe');
    await frame.locator('#card').waitFor({ state: 'visible' });
    await frame.locator('#other').check();
    assert.equal(await frame.locator('#copy').isDisabled(), true);
    await frame.locator('#notes').fill('Include a no-search option.');
    assert.match(await frame.locator('#reply').inputValue(), /modified options/);
    await frame.locator('#copy').click();
    await frame.locator('#status').filter({ hasText: 'Clipboard unavailable' }).waitFor();
    assert.ok(await frame.locator('#reply').evaluate((node) => node.selectionEnd > node.selectionStart));
    assert.equal(await frame.locator('input:checked').count(), 1);
    assert.equal(await frame.locator('#card').evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await context.close();
  } finally {
    await browser?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
