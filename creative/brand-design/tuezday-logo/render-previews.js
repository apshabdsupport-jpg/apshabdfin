const { chromium } = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 2000 }, deviceScaleFactor: 1 });
  const base = path.resolve(__dirname, 'concepts');
  for (const [source, output, width, height] of [
    ['tuezday-system-direction-01.svg', 'tuezday-system-direction-01.png', 1600, 2000],
    ['tuezday-avatar-direction-01.svg', 'tuezday-avatar-direction-01.png', 1024, 1024],
    ['tuezday-wordmark-direction-01.svg', 'tuezday-wordmark-direction-01.png', 1800, 520],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('file:///' + path.join(base, source).replace(/\\/g, '/'));
    await page.screenshot({ path: path.join(base, output), omitBackground: false });
  }
  await browser.close();
})();
