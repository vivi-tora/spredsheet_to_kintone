import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer-extra';
import type { Browser } from 'puppeteer';
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
      const trimmed = value.trim();
      return trimmed !== '' && trimmed !== '---  ---';
    }
    if (typeof value === 'object' && value !== null) {
      return hasNonEmptyValues(value);
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

  let browser: Browser; // 修正: 型を明示的に指定
  try {
    browser = await puppeteer.launch({
      headless: true,
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
          await delay(index * 2000); // スクレイピングツールブロック避け
          console.log(`Processing item ${index + 1}/${spreadsheetData.length}, JAN: ${item.singleProductJan}`);

          const tsuruData = await scrapeTsurumai(browser, item.singleProductJan, scrapingRules.tsuruHobby, {
            description: item.description || '',
            specifications: item.specifications || ''
          });
          console.log(`Tsurumai data for JAN ${item.singleProductJan}:`, tsuruData);
          if (hasNonEmptyValues(tsuruData)) {
            item.description = tsuruData.description;
            item.specifications = tsuruData.specifications;
            return item;
          }

          const amiamiData = await scrapeAmiami(browser, item.singleProductJan, scrapingRules.amiami, {
            description: item.description || '',
            specifications: item.specifications || ''
          });
          console.log(`Amiami data for JAN ${item.singleProductJan}:`, amiamiData);
          if (hasNonEmptyValues(amiamiData)) {
            item.description = amiamiData.description;
            item.specifications = amiamiData.specifications;
            return item;
          }

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