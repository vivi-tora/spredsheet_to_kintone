import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer, { Browser } from 'puppeteer';
import { AppError, handleApiError } from '../../lib/errorHandling';
import { scrapingRules } from '../../config/scrapingRules';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const spreadsheetData = req.body;

  let browser: Browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const scrapedData = await Promise.all(
      spreadsheetData.map(async (item: any, index: number) => {
        try {
          await delay(index * 1000); // 1秒ごとに遅延

          const tsuruData = await scrapeWebsite(browser, item.singleProductJan, scrapingRules.tsuruHobby);
          if (Object.keys(tsuruData).length > 0) return { ...item, ...tsuruData };

          const amiamiData = await scrapeWebsite(browser, item.singleProductJan, scrapingRules.amiami);
          return { ...item, ...amiamiData };
        } catch (error) {
          console.error(`Error scraping data for JAN ${item.singleProductJan}:`, error);
          return { ...item, error: String(error) };
        }
      })
    );

    res.status(200).json(scrapedData);
  } catch (error) {
    console.error('Error in scrapeData handler:', error);
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message, error: error instanceof Error ? error.stack : String(error) });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeWebsite(browser: Browser, singleProductJan: string, rule: any) {
  const page = await browser.newPage();
  try {
    const url = rule.url.replace('{janCode}', singleProductJan);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.setViewport({width: 1280, height: 800});

    const result = await page.evaluate((selectors) => {
      const data: { [key: string]: string } = {};

      for (const [key, searchText] of Object.entries(selectors)) {
        if (key === 'description') {
          const element = document.querySelector('p[itemprop="description"]');
          if (element) {
            data[key] = element.textContent?.trim() || '';
          }
        } else {
          const dt = Array.from(document.querySelectorAll('dt')).find(el => el.textContent?.includes(searchText as string));
          if (dt) {
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
              data[key] = dd.textContent?.trim() || '';
            }
          }
        }
      }

      return data;
    }, rule.selectors);

    if (rule.productLinkSelector) {
      const productUrl = await page.evaluate((selector) => {
        const link = document.querySelector(selector);
        return link ? (link as HTMLAnchorElement).href : null;
      }, rule.productLinkSelector);

      if (productUrl) {
        await page.goto(productUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        const productData = await page.evaluate((selectors) => {
          const data: { [key: string]: string } = {};
          for (const [key, searchText] of Object.entries(selectors)) {
            const heading = Array.from(document.querySelectorAll('p.heading_07')).find(el => el.textContent?.includes(searchText as string));
            if (heading) {
              const content = heading.nextElementSibling;
              if (content && content.classList.contains('box_01')) {
                data[key] = content.textContent?.trim() || '';
              }
            }
          }
          return data;
        }, rule.selectors);

        Object.assign(result, productData);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in scrapeWebsite:', error);
    if (error instanceof Error) {
      throw new AppError(`Error scraping website: ${error.message}`, 500, { singleProductJan, rule });
    }
    throw new AppError('Unknown error scraping website', 500, { singleProductJan, rule });
  } finally {
    await page.close();
  }
}
