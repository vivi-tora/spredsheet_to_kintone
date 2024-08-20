import type { Browser } from "puppeteer";
import { AppError } from "../../lib/errorHandling";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeTsurumai(
  browser: Browser,
  singleProductJan: string,
  rule: any,
  existingData: { description: string; specifications: string }
) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    const url = rule.url.replace("{janCode}", singleProductJan);
    console.log(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Page loaded, waiting for content");

    const productExists = await page.evaluate(() => {
      return (
        !!document.querySelector('p[itemprop="description"]') ||
        !!document.querySelector("dt")
      );
    });

    console.log("Product information exists:", productExists);

    if (!productExists) {
      // console.log('Product information not found, waiting for 10 seconds');
      // await page.evaluate(wait, 10000);
    }

    const newData = await page.evaluate((selectors) => {
      const data: { description: string; specifications: string } = {
        description: "",
        specifications: "",
      };

      // Handle description separately
      const descElement = document.querySelector('p[itemprop="description"]');
      if (descElement) {
        data.description = descElement.textContent?.trim() || "";
        console.log(
          `Description found: ${data.description.substring(0, 50)}...`
        );
      } else {
        console.log("Description element not found");
      }

      // Handle other selectors
      for (const [key, searchText] of Object.entries(selectors)) {
        if (key !== "description") {
          const dt = Array.from(document.querySelectorAll("dt")).find((el) =>
            el.textContent?.includes(searchText as string)
          );
          if (dt) {
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === "DD") {
              const content = dd.textContent?.trim() || "";
              data.specifications += `${searchText}: ${content}\n`;
              console.log(`${key} found: ${content.substring(0, 50)}...`);
            } else {
              console.log(`DD element not found for ${key}`);
            }
          } else {
            console.log(`DT element not found for ${key}`);
          }
        }
      }

      return data;
    }, rule.selectors);

    const result = {
      description:
        existingData.description +
        (existingData.description && newData.description ? "\n" : "") +
        newData.description,
      specifications:
        existingData.specifications +
        (existingData.specifications && newData.specifications ? "\n" : "") +
        newData.specifications,
    };

    console.log("Final scraping result:", result);
    return result;
  } catch (error) {
    console.error("Error in scrapeTsurumai:", error);
    if (error instanceof Error) {
      throw new AppError(`Error scraping Tsurumai: ${error.message}`, 500, {
        singleProductJan,
        rule,
      });
    }
    throw new AppError("Unknown error scraping Tsurumai", 500, {
      singleProductJan,
      rule,
    });
  } finally {
    await page.close();
  }
}
