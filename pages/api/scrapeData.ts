import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import cheerio from 'cheerio';
import { AppError, handleApiError } from '../../lib/errorHandling';
import { scrapingRules } from '../../config/scrapingRules';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const spreadsheetData = req.body;

  try {
    const scrapedData = await Promise.all(
      spreadsheetData.map(async (item: any) => {
        const tsuruData = await scrapeWebsite(item.janCode, scrapingRules.tsuruHobby);
        
        if (tsuruData) return { ...item, ...tsuruData };

        const amiamiData = await scrapeWebsite(item.janCode, scrapingRules.amiami);
        return { ...item, ...amiamiData };
      })
    );

    res.status(200).json(scrapedData);
  } catch (error) {
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message });
  }
}

async function scrapeWebsite(janCode: string, rule: any) {
  try {
    const url = rule.url.replace('{janCode}', janCode);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const result: { [key: string]: string } = {};

    for (const [key, selector] of Object.entries(rule.selectors)) {
      result[key] = $(selector as string).text().trim();
    }

    if (rule.productLinkSelector) {
      const productUrl = $(rule.productLinkSelector).attr('href');
      if (productUrl) {
        const { data: productData } = await axios.get(productUrl);
        const $product = cheerio.load(productData);
        for (const [key, selector] of Object.entries(rule.selectors)) {
          result[key] = $product(selector as string).text().trim();
        }
      }
    }

    return result;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw new AppError('Error scraping website', 500, { janCode, rule });
  }
}
