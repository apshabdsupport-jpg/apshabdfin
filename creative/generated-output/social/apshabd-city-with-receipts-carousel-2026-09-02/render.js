const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');

(async () => {
  const outputDir = __dirname;
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1450 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(outputDir, 'carousel.html').replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const slideFiles = [];
  for (let i = 1; i <= 5; i++) {
    const file = path.join(outputDir, `apshabd-city-receipts-slide-${String(i).padStart(2, '0')}-1080x1350.png`);
    await page.locator(`#slide-${i}`).screenshot({ path: file });
    slideFiles.push(file);
  }

  await browser.close();

  const thumbs = await Promise.all(slideFiles.map(file => sharp(file).resize({ width: 324, height: 405, fit: 'cover' }).png().toBuffer()));
  await sharp({ create: { width: 1620, height: 405, channels: 4, background: '#111111' } })
    .composite(thumbs.map((input, index) => ({ input, left: index * 324, top: 0 })))
    .jpeg({ quality: 92 })
    .toFile(path.join(outputDir, 'apshabd-city-receipts-carousel-preview.jpg'));

  console.log(slideFiles.join('\n'));
})();
