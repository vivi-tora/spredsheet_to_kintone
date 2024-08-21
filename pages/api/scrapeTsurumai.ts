import axios from "axios";
import { parse } from "node-html-parser";
import { AppError } from "../../lib/errorHandling";

export async function scrapeTsurumai(
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

    const newData: { description: string; specifications: string } = {
      description: "",
      specifications: "",
    };
    

    // Handle description separately
    const descElement = root.querySelector('p[itemprop="description"]');
    if (descElement) {
      newData.description = descElement.text.trim();
      console.log(
        `Description found: ${newData.description.substring(0, 50)}...`
      );
    } else {
      console.log("Description element not found");
    }

    // Handle other selectors
    for (const [key, searchText] of Object.entries(rule.selectors)) {
      if (key !== "description") {
        const dt = root
          .querySelectorAll("dt")
          .find((el) => el.text.includes(searchText as string));
        if (dt) {
          const dd = dt.nextElementSibling;
          if (dd && dd.tagName === "DD") {
            const content = dd.text.trim();
            newData.specifications += `${searchText}: ${content}\n`;
            console.log(`${key} found: ${content.substring(0, 50)}...`);
          } else {
            console.log(`DD element not found for ${key}`);
          }
        } else {
          console.log(`DT element not found for ${key}`);
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
  }
}
