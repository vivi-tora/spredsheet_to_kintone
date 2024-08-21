import type { NextApiRequest, NextApiResponse } from "next";
import puppeteer from "puppeteer";
import { scrapingRules } from "../../config/scrapingRules";
import { scrapeTsurumai } from "./scrapeTsurumai";
import { scrapeAmiami } from "./scrapeAmiami";
import Cors from "cors";
import type { NextApiHandler } from "next";

// CORSミドルウェアの初期化
const cors = Cors({
  methods: ["POST", "HEAD"],
});

// ミドルウェア実行用のヘルパー関数
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, next: (result: any) => void) => void
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hasNonEmptyValues = (obj: Record<string, any>): boolean => {
  return Object.values(obj).some((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed !== "" && trimmed !== "---  ---";
    }
    if (typeof value === "object" && value !== null) {
      return hasNonEmptyValues(value);
    }
    return value !== null && value !== undefined;
  });
};

async function getBrowser() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  return browser;
}

const handler: NextApiHandler = async (req, res) => {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const spreadsheetData = req.body;
  console.log(`Received ${spreadsheetData.length} items to scrape`);

  let browser = null;
  try {
    browser = await getBrowser();
    console.log("Browser launched successfully");

    const scrapedData = [];
    for (const [index, item] of spreadsheetData.entries()) {
      try {
        await delay(index * 2000);
        console.log(
          `Processing item ${index + 1}/${spreadsheetData.length}, JAN: ${
            item.singleProductJan
          }`
        );

        const page = await browser.newPage();
        try {
          const tsuruData = await scrapeTsurumai(
            browser,
            item.singleProductJan,
            scrapingRules.tsuruHobby,
            {
              description: item.description || "",
              specifications: item.specifications || "",
            }
          );

          if (hasNonEmptyValues(tsuruData)) {
            item.description = tsuruData.description;
            item.specifications = tsuruData.specifications;
            scrapedData.push(item);
            continue;
          }

          const amiamiData = await scrapeAmiami(
            browser,
            item.singleProductJan,
            scrapingRules.amiami,
            {
              description: item.description || "",
              specifications: item.specifications || "",
            }
          );

          if (hasNonEmptyValues(amiamiData)) {
            item.description = amiamiData.description;
            item.specifications = amiamiData.specifications;
            scrapedData.push(item);
            continue;
          }

          console.log(`No valid data found for JAN ${item.singleProductJan}`);
          scrapedData.push(item);
        } finally {
          await page.close();
        }
      } catch (error) {
        console.error(
          `Error scraping data for JAN ${item.singleProductJan}:`,
          error
        );
        scrapedData.push({ ...item, error: String(error) });
      }
    }

    console.log("All items processed");
    res.status(200).json(scrapedData);
  } catch (error) {
    console.error("Error in scrapeData handler:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }
  }
};

export default handler;

