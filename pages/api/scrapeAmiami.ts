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
    console.log(`Navigating to URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const root = parse(response.data);
    console.log("Page loaded, parsing content");

    const productBoxes = root.querySelectorAll(
      ".product_table_list .product_box, .product_box"
    );
    console.log(`Found ${productBoxes.length} product boxes`);

    if (productBoxes.length > 0) {
      const lastProductBox = productBoxes[productBoxes.length - 1];
      const productLink = lastProductBox
        .querySelector("a")
        ?.getAttribute("href");

      console.log(`Product link found: ${productLink}`);

      if (productLink) {
        console.log(`Navigating to product page: ${productLink}`);
        const productResponse = await axios.get(productLink, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

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
            }
          }

          const descHeading = explainDiv
            .querySelectorAll("p.heading_07")
            .find((el) => el.text.includes("解説"));
          if (descHeading) {
            const descContent = descHeading.nextElementSibling;
            if (descContent) {
              newData.description = descContent.text.trim();
            }
          }
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
  }
}
