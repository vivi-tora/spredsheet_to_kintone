import type { Browser } from "puppeteer";
import { AppError } from "../../lib/errorHandling";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeAmiami(
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
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.setViewport({ width: 1280, height: 800 });

    console.log("Page loaded, waiting for content");

    const isChallengePresent = await page.evaluate(() => {
      return document.title.includes("Attention Required! | Cloudflare");
    });

    if (isChallengePresent) {
      console.log("Cloudflare challenge detected. Waiting for 30 seconds...");
      await page.evaluate(wait, 30000);
      await page.reload({ waitUntil: "networkidle0" });
    }

    const productBoxExists = await page.evaluate(() => {
      return (
        !!document.querySelector(".product_table_list .product_box") ||
        !!document.querySelector(".product_box") ||
        !!document.querySelector("#search_table")
      );
    });

    console.log("Product box exists:", productBoxExists);

    if (!productBoxExists) {
      console.log("Product box not found, waiting for 10 seconds");
      await page.evaluate(wait, 10000);
    }

    const productBoxes = await page.$$(
      ".product_table_list .product_box, .product_box"
    );
    console.log(`Found ${productBoxes.length} product boxes`);

    if (productBoxes.length > 0) {
      const lastProductBox = productBoxes[productBoxes.length - 1];
      const productLink = await lastProductBox
        .$eval("a", (el) => el.href)
        .catch(() => null);

      console.log(`Product link found: ${productLink}`);

      if (productLink) {
        console.log(`Navigating to product page: ${productLink}`);
        await page.goto(productLink, {
          waitUntil: "networkidle0",
          timeout: 60000,
        });

        await page.waitForSelector("#explain.explain", { timeout: 30000 });

        const newData = await page.evaluate(() => {
          const data: { description: string; specifications: string } = {
            description: "",
            specifications: "",
          };
          const explainDiv = document.querySelector("#explain.explain");
          if (explainDiv) {
            const specHeading = Array.from(
              explainDiv.querySelectorAll("p.heading_07")
            ).find((el) => el.textContent?.includes("製品仕様"));
            if (specHeading) {
              const specContent = specHeading.nextElementSibling;
              if (specContent) {
                data.specifications = specContent.textContent?.trim() || "";
              }
            }

            const descHeading = Array.from(
              explainDiv.querySelectorAll("p.heading_07")
            ).find((el) => el.textContent?.includes("解説"));
            if (descHeading) {
              const descContent = descHeading.nextElementSibling;
              if (descContent) {
                data.description = descContent.textContent?.trim() || "";
              }
            }
          }
          return data;
        });

        const result = {
          description:
            existingData.description +
            (existingData.description && newData.description ? "\n" : "") +
            newData.description,
          specifications:
            existingData.specifications +
            (existingData.specifications && newData.specifications
              ? "\n"
              : "") +
            newData.specifications,
        };

        console.log("Scraping result:", result);
        return result;
      } else {
        console.log("No product link found");
      }
    } else {
      console.log("No product boxes found with any selector");
    }

    return existingData;
  } catch (error) {
    console.error("Error in scrapeAmiami:", error);
    if (error instanceof Error) {
      throw new AppError(`Error scraping Amiami: ${error.message}`, 500, {
        singleProductJan,
        rule,
      });
    }
    throw new AppError("Unknown error scraping Amiami", 500, {
      singleProductJan,
      rule,
    });
  } finally {
    await page.close();
  }
}
