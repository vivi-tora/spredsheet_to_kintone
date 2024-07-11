import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer, { Browser } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { AppError, handleApiError } from '../../lib/errorHandling';
import { scrapingRules } from '../../config/scrapingRules';
import { scrapeTsurumai } from './scrapeTsurumai';
import { scrapeAmiami } from './scrapeAmiami';

puppeteer.use(StealthPlugin());

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const hasNonEmptyValues = (obj: Record<string, any>): boolean => {
  return Object.values(obj).some(value => {
    if (typeof value === 'string') {
      return value.trim() !== '';
    }
    return value !== null && value !== undefined;
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const spreadsheetData = req.body;
  console.log(`Received ${spreadsheetData.length} items to scrape`);

  let browser: Browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
    });
    console.log('Browser launched successfully');

    const scrapedData = await Promise.all(
      spreadsheetData.map(async (item: any, index: number) => {
        try {
          await delay(index * 2000); // 2秒ごとに遅延
          console.log(`Processing item ${index + 1}/${spreadsheetData.length}, JAN: ${item.singleProductJan}`);

          const tsuruData = await scrapeTsurumai(browser, item.singleProductJan, scrapingRules.tsuruHobby);
          console.log(`Tsurumai data for JAN ${item.singleProductJan}:`, tsuruData);
          if (hasNonEmptyValues(tsuruData)) return { ...item, ...tsuruData };

          const amiamiData = await scrapeAmiami(browser, item.singleProductJan, scrapingRules.amiami);
          console.log(`Amiami data for JAN ${item.singleProductJan}:`, amiamiData);
          if (hasNonEmptyValues(amiamiData)) return { ...item, ...amiamiData };

          console.log(`No valid data found for JAN ${item.singleProductJan}`);
          return item;
        } catch (error) {
          console.error(`Error scraping data for JAN ${item.singleProductJan}:`, error);
          return { ...item, error: String(error) };
        }
      })
    );

    console.log('All items processed');
    res.status(200).json(scrapedData);
  } catch (error) {
    console.error('Error in scrapeData handler:', error);
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message, error: error instanceof Error ? error.stack : String(error) });
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}
