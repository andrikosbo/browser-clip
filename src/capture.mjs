import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { frame, scrollPosition } from './spec.mjs';

export async function openBrowser() {
  try {
    return await chromium.launch({ headless: true, timeout: 15_000, args: ['--no-proxy-server'] });
  } catch (error) {
    throw new Error('Chromium did not start. Run npx playwright install chromium --only-shell and try again.', { cause: error });
  }
}

export async function capture(url, frames, directory) {
  const browser = await openBrowser();
  try {
    const { width, height } = frame.screen;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      acceptDownloads: false,
      reducedMotion: 'reduce'
    });

    await context.routeWebSocket('**/*', socket => socket.close());
    await context.route('**/*', async route => {
      const request = route.request();
      const requestURL = new URL(request.url());
      if (requestURL.origin !== url.origin || !['GET', 'HEAD'].includes(request.method())) {
        await route.abort();
        return;
      }

      // Fetch one response only, so a redirect cannot issue another request.
      let response;
      try {
        response = await route.fetch({ maxRedirects: 0, timeout: 10_000 });
        if (response.status() >= 300 && response.status() < 400) {
          await route.abort();
        } else {
          await route.fulfill({ response });
        }
      } catch {
        await route.abort().catch(() => {});
      } finally {
        await response?.dispose();
      }
    });

    const page = await context.newPage();
    const response = await page.goto(url.href, { waitUntil: 'load', timeout: 15_000 });
    if (!response?.ok() || new URL(page.url()).origin !== url.origin) {
      throw new Error('Expected a successful page response on the original loopback origin.');
    }

    const distance = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = document.scrollingElement;
      return Math.max(0, root.scrollHeight - root.clientHeight);
    });

    for (let index = 0; index < frames; index++) {
      await page.evaluate(top => {
        window.scrollTo({ top, behavior: 'instant' });
      }, scrollPosition(index, frames, distance));
      await page.screenshot({
        path: join(directory, `screen-${String(index).padStart(3, '0')}.png`),
        animations: 'disabled',
        caret: 'hide',
        timeout: 5_000
      });
    }

    const scene = await context.newPage();
    await scene.setViewportSize({ width: frame.width, height: frame.height });
    const artwork = await readFile(new URL('../assets/frame.html', import.meta.url), 'utf8');
    await scene.setContent(artwork);
    await scene.screenshot({ path: join(directory, 'frame.png'), timeout: 5_000 });
    return browser.version();
  } finally {
    await browser.close();
  }
}
