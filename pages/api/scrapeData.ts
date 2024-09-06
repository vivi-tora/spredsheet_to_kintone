import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "node-html-parser";
import axios from "axios";
import { scrapingRules } from "../../config/scrapingRules";
import Cors from "cors";
import type { NextApiHandler } from "next";
import pLimit from "p-limit";

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

async function scrapeWebsite(url: string, selectors: any) {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });
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

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;

const handler: NextApiHandler = async (req, res) => {
  await runMiddleware(req, res, cors);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const spreadsheetData = req.body;
  console.log(`Received ${spreadsheetData.length} items to scrape`);

  try {
    const limit = pLimit(CONCURRENCY_LIMIT);
    const scrapedData = [];

    for (let i = 0; i < spreadsheetData.length; i += BATCH_SIZE) {
      const batch = spreadsheetData.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((item, index) =>
          limit(() => scrapeItem(item, i + index, spreadsheetData.length))
        )
      );
      scrapedData.push(...batchResults);
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

async function scrapeItem(item: any, index: number, total: number) {
  try {
    await delay(500); // Reduced delay
    console.log(
      `Processing item ${index + 1}/${total}, JAN: ${item.singleProductJan}`
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
      return item;
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
      return item;
    }

    console.log(`No valid data found for JAN ${item.singleProductJan}`);
    return item;
  } catch (error) {
    console.error(
      `Error scraping data for JAN ${item.singleProductJan}:`,
      error
    );
    return { ...item, error: String(error) };
  }
}

export default handler;
