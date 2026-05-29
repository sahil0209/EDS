import puppeteer from 'puppeteer'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
import { createServer } from 'http';
import open from 'open'; // eslint-disable-line import/no-extraneous-dependencies, import/no-unresolved
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger, colors } from './utils.js';

const PORT = 4001;
const CACHE_TTL = 5 * 60 * 1000;

const pageCache = {};

const COMMON_HEADERS = {
  CORS: {
    'Access-Control-Allow-Origin': '*',
  },
  CORS_PREFLIGHT: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
  },
  NO_CACHE: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  HTML_CONTENT_TYPE: {
    'Content-Type': 'text/html; charset=utf-8',
  },
  JSON_CONTENT: {
    'Content-Type': 'application/json; charset=utf-8',
  },
};

const sendCachedResponse = (res, html) => {
  const headers = {
    ...COMMON_HEADERS.HTML_CONTENT_TYPE,
    ...COMMON_HEADERS.CORS,
    ...COMMON_HEADERS.NO_CACHE,
    'X-Rendered-By': 'myridius-content-import-proxy-cache',
    'X-Cache-Hit': 'true',
  };
  res.writeHead(200, headers);
  res.end(html);
};

const sendErrorResponse = (res, error) => {
  const headers = {
    ...COMMON_HEADERS.JSON_CONTENT,
    ...COMMON_HEADERS.CORS,
  };
  res.writeHead(500, headers);
  res.end(JSON.stringify({
    error: 'Rendering failed',
    message: error.message,
    timestamp: new Date().toISOString(),
  }, null, 2));
};

const cacheAndServe = (cacheKey, result) => {
  pageCache[cacheKey] = {
    html: result.html,
    timestamp: Date.now(),
  };

  return {
    ...COMMON_HEADERS.HTML_CONTENT_TYPE,
    ...COMMON_HEADERS.CORS,
    ...COMMON_HEADERS.NO_CACHE,
    'X-Rendered-By': 'myridius-content-import-proxy',
    'X-Original-Url': result.originalUrl,
    'X-Content-Quality': result.isRichContent ? 'rich' : 'basic',
    'X-Cache-Hit': 'false',
  };
};

async function prerenderPage(targetUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();

    const fontPath = join(process.cwd(), '..', '..', 'fonts', 'pepmdx', 'pepmdx.woff');
    const fontData = readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    await page.evaluateOnNewDocument((encodedFont) => {
      const fontInjection = `
      <style>
        @font-face {
          font-family: 'Pepmdx';
          src: url('data:font/woff;base64,${encodedFont}') format('woff');
          font-weight: normal;
          font-style: normal;
        }
      </style>`;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          const head = document.head || document.getElementsByTagName('head')[0];
          head.insertAdjacentHTML('beforeend', fontInjection);
        });
      } else {
        const head = document.head || document.getElementsByTagName('head')[0];
        head.insertAdjacentHTML('beforeend', fontInjection);
      }
    }, fontBase64);

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await Promise.race([
      page.waitForSelector('main', { timeout: 15000 }).catch(() => null),
      page.waitForSelector('#mainBody', { timeout: 15000 }).catch(() => null),
      page.waitForSelector('.contentSection', { timeout: 15000 }).catch(() => null),
      page.waitForSelector('[ui-view="content"]', { timeout: 15000 }).catch(() => null),
      page.waitForSelector('article', { timeout: 15000 }).catch(() => null),
    ]);

    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const { scrollHeight } = document.body;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.every((img) => img.complete || img.naturalHeight !== 0);
    }, { timeout: 10000 }).catch(() => {
      logger.warn('Some images may have failed to load.');
    });

    await page.waitForFunction(() => document.querySelector('span[category-id]') !== null, { timeout: 10000 }).catch(() => {
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });

    let html = await page.content();
    const title = await page.title();
    html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, '<!-- base href removed by proxy -->');
    html = html.replace(
      /<i class="([^"]*icon__[^"]*)"([^>]*?)>([^<]*?)<\/i>/g,
      (match, classes, otherAttrs, content) => {
        const cleanAttrs = otherAttrs
          .replace(/\s*ng-if="[^"]*"/g, '')
          .replace(/\s*ng-transclude="[^"]*"/g, '')
          .replace(/\s*ng-style="[^"]*"/g, '')
          .replace(/\s*aria-hidden="[^"]*"/g, '');

        return `<span class="${classes}"${cleanAttrs}>${content}</span>`;
      },
    );

    html = html.replace(
      /<a([^>]*?)>\s*<img([^>]*?)>\s*<\/a>/g,
      (match, anchorAttrs, imgAttrs) => {
        const cleanImgAttrs = imgAttrs
          .replace(/\s*ng-if="[^"]*"/g, '')
          .replace(/\s*ng-class="[^"]*"/g, '')
          .replace(/\s*ng-attr-[^=]*="[^"]*"/g, '')
          .replace(/\s*image-data="[^"]*"/g, '')
          .replace(/\s*ng-src="[^"]*"/g, '')
          .replace(/\s*lazy-load="[^"]*"/g, '');
        return `<img${cleanImgAttrs}>`;
      },
    );

    html = html.replace(
      /<a([^>]*?)>([^<]*?)<\/a>/g,
      (match, attrs, content) => {
        let linkText = content.trim();
        if (!linkText) {
          const hrefMatch = attrs.match(/href=["']([^"']*)["']/);
          linkText = hrefMatch ? hrefMatch[1] : 'Learn More';
        }
        return `<a${attrs}>${linkText}</a>`;
      },
    );

    html = html.replace(
      /<span[^>]*category-id=["']([^"']*)["'][^>]*>\s*<\/span>/g,
      (match, categoryId) => `<span class="category-id">${categoryId}</span>`,
    );

    const isRichContent = html.includes('ng-app="runSpa"') && html.length > 20000;

    logger.success('Rendering complete');

    return {
      html, title, originalUrl: targetUrl, isRichContent,
    };
  } finally {
    await browser.close();
  }
}

function normalizePathname(pathname) {
  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isAssetRequest(pathname) {
  const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'];
  return assetExtensions.some((ext) => pathname.toLowerCase().endsWith(ext));
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const { pathname: originalPathname } = requestUrl;
  const pathname = normalizePathname(originalPathname);

  if (!isAssetRequest(pathname)) {
    logger.request(req.method, pathname);
  }

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, COMMON_HEADERS.CORS_PREFLIGHT);
      res.end();
      return;
    }

    if (isAssetRequest(pathname)) {
      const assetUrl = `https://www.myridius.com${pathname}`;
      res.writeHead(302, { ...COMMON_HEADERS.CORS, Location: assetUrl });
      res.end();
      return;
    }

    const targetUrl = `https://www.myridius.com${pathname}`;
    const cacheKey = targetUrl;

    if (pathname !== '/') {
      logger.info(`Rendering page: ${colors.highlight(pathname)}`);
    }

    const cached = pageCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      if (pathname !== '/') {
        logger.success(`✅ Served ${pathname} from cache`);
      }
      sendCachedResponse(res, cached.html);
      return;
    }

    const result = await prerenderPage(targetUrl);
    const headers = cacheAndServe(cacheKey, result);
    res.writeHead(200, headers);
    res.end(result.html);
  } catch (error) {
    logger.error(`Request failed: ${error.message}`);
    sendErrorResponse(res, error);
  }
});

server.listen(PORT, async () => {
  const serverMessage = `Server running on: ${colors.highlight(`http://localhost:${PORT}`)}`;
  logger.box('🎯 Import Proxy Server', serverMessage, { borderColor: 'green' });
  logger.warn('Press Ctrl+C to stop the server');

  try {
    await open(`http://localhost:${PORT}`);
  } catch (error) {
    logger.warn(`Could not open browser: ${error.message}`);
  }

  console.log('\n'); // eslint-disable-line no-console
});

process.on('SIGINT', () => {
  logger.error('Shutting down...'); // eslint-disable-line no-console
  process.exit(0);
});

export default server;
