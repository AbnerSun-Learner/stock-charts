#!/usr/bin/env node
/**
 * 打开旭日图页面并截屏，用于检查扇区颜色是否按一级分类一致
 * 用法: node scripts/check-sunburst-colors.js
 * 需要先 npm run dev，截图保存到 sunburst-screenshot.png
 */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'http://localhost:3000/view/sunburst?token=d01d9047-8dae-408d-adbf-e8034abace04';
const OUT = path.join(__dirname, '..', 'sunburst-screenshot.png');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 900, height: 700 });
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('.sunburst-chart-wrap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    const wrap = await page.$('.sunburst-chart-wrap');
    if (wrap) {
      await wrap.screenshot({ path: OUT });
      console.log('Screenshot saved to', OUT);
    }
    const hasCanvas = await page.$('.sunburst-chart-wrap canvas');
    console.log('Chart renderer:', hasCanvas ? 'canvas' : 'unknown');
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
