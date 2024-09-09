// scrapeAmiami.ts

import axios from "axios";
import { parse } from "node-html-parser";
import { AppError } from "../../lib/errorHandling";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeAmiami(
  singleProductJan: string,
  rule: any,
  existingData: { description: string; specifications: string }
) {
  try {
    const url = rule.url.replace("{janCode}", singleProductJan);
    console.log(`[DEBUG] Amiami - Navigating to URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    console.log(`[DEBUG] Amiami - Response status: ${response.status}`);
    const root = parse(response.data);
    console.log("[DEBUG] Amiami - Page loaded, parsing content");

    const productBoxes = root.querySelectorAll(
      ".product_table_list .product_box, .product_box"
    );
    console.log(`[DEBUG] Amiami - Found ${productBoxes.length} product boxes`);

    if (productBoxes.length > 0) {
      const lastProductBox = productBoxes[productBoxes.length - 1];
      const productLink = lastProductBox
        .querySelector("a")
        ?.getAttribute("href");

      console.log(`[DEBUG] Amiami - Product link found: ${productLink}`);

      if (productLink) {
        console.log(
          `[DEBUG] Amiami - Navigating to product page: ${productLink}`
        );
        const productResponse = await axios.get(productLink, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        console.log(
          `[DEBUG] Amiami - Product page response status: ${productResponse.status}`
        );
        const productRoot = parse(productResponse.data);
        const explainDiv = productRoot.querySelector("#explain.explain");

        const newData: { description: string; specifications: string } = {
          description: "",
          specifications: "",
        };

        if (explainDiv) {
          const specHeading = explainDiv
            .querySelectorAll("p.heading_07")
            .find((el) => el.text.includes("製品仕様"));
          if (specHeading) {
            const specContent = specHeading.nextElementSibling;
            if (specContent) {
              newData.specifications = specContent.text.trim();
              console.log(
                `[DEBUG] Amiami - Specifications found: ${newData.specifications.substring(
                  0,
                  100
                )}...`
              );
            }
          } else {
            console.log("[DEBUG] Amiami - Specifications heading not found");
          }

          const descHeading = explainDiv
            .querySelectorAll("p.heading_07")
            .find((el) => el.text.includes("解説"));
          if (descHeading) {
            const descContent = descHeading.nextElementSibling;
            if (descContent) {
              newData.description = descContent.text.trim();
              console.log(
                `[DEBUG] Amiami - Description found: ${newData.description.substring(
                  0,
                  100
                )}...`
              );
            }
          } else {
            console.log("[DEBUG] Amiami - Description heading not found");
          }
        } else {
          console.log("[DEBUG] Amiami - Explain div not found");
        }

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

        console.log("[DEBUG] Amiami - Final scraping result:");
        console.log(JSON.stringify(result, null, 2));
        return result;
      } else {
        console.log("[DEBUG] Amiami - No product link found");
      }
    } else {
      console.log("[DEBUG] Amiami - No product boxes found with any selector");
    }

    console.log("[DEBUG] Amiami - Returning existing data (no new data found)");
    return existingData;
  } catch (error) {
    console.error("[DEBUG] Amiami - Error in scrapeAmiami:", error);
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
  }
}
