import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios from "axios";
import { scrapingRules } from "../../config/scrapingRules";
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
  fn: (
    req: NextApiRequest,
    res: NextApiResponse,
    next: (result: any) => void
  ) => void
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hasNonEmptyValues = (obj: Record<string, any>): boolean => {
  // ... (既存のコード)
};

async function scrapeWebsite(url: string, selectors: any) {
  const response = await axios.get(url);
  const root = parse(response.data);

  const data: { description: string; specifications: string } = {
    description: "",
    specifications: "",
  };

  if (selectors.description) {
    const descElement = root.querySelector(selectors.description);
    if (descElement) {
      data.description = descElement.text.trim();
    }
  }

  if (selectors.specifications) {
    const specElements = root.querySelectorAll(selectors.specifications);
    data.specifications = specElements.map((el) => el.text.trim()).join("\n");
  }

  return data;
}

const handler: NextApiHandler = async (req, res) => {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const spreadsheetData = req.body;
  console.log(`Received ${spreadsheetData.length} items to scrape`);

  try {
    const scrapedData = [];
    for (const [index, item] of spreadsheetData.entries()) {
      try {
        await delay(index * 2000);
        console.log(
          `Processing item ${index + 1}/${spreadsheetData.length}, JAN: ${
            item.singleProductJan
          }`
        );

        const tsuruUrl = scrapingRules.tsuruHobby.url.replace(
          "{janCode}",
          item.singleProductJan
        );
        const tsuruData = await scrapeWebsite(
          tsuruUrl,
          scrapingRules.tsuruHobby.selectors
        );

        if (hasNonEmptyValues(tsuruData)) {
          item.description = tsuruData.description;
          item.specifications = tsuruData.specifications;
          scrapedData.push(item);
          continue;
        }

        const amiamiUrl = scrapingRules.amiami.url.replace(
          "{janCode}",
          item.singleProductJan
        );
        const amiamiData = await scrapeWebsite(
          amiamiUrl,
          scrapingRules.amiami.selectors
        );

        if (hasNonEmptyValues(amiamiData)) {
          item.description = amiamiData.description;
          item.specifications = amiamiData.specifications;
          scrapedData.push(item);
          continue;
        }

        console.log(`No valid data found for JAN ${item.singleProductJan}`);
        scrapedData.push(item);
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
    console.error("Detailed error in scrapeData:", error);
    res.status(500).json({
      message: "Internal server error",
      error:
        error instanceof Error
          ? `${error.message}\nStack: ${error.stack}`
          : String(error),
    });
  }
};

export default handler;
