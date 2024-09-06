// scrapeTsurumai.ts

import axios, { AxiosError } from "axios";
import { parse } from "node-html-parser";
import { AppError } from "../../lib/errorHandling";

export async function scrapeTsurumai(
  singleProductJan: string,
  rule: any,
  existingData: { description: string; specifications: string }
): Promise<{ description: string; specifications: string }> {
  try {
    const url = rule.url.replace("{janCode}", singleProductJan);
    console.log(`[DEBUG] Tsurumai - Navigating to URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      validateStatus: (status) => status < 500, // Allow 404 to be handled without throwing
    });

    console.log(`[DEBUG] Tsurumai - Response status: ${response.status}`);

    if (response.status === 404) {
      console.log(
        `[DEBUG] Tsurumai - Page not found for JAN: ${singleProductJan}`
      );
      return existingData; // Return existing data without modification
    }

    const root = parse(response.data);
    console.log("[DEBUG] Tsurumai - Page loaded, parsing content");

    const newData: { description: string; specifications: string } = {
      description: "",
      specifications: "",
    };

    // Handle description separately
    const descElement = root.querySelector('p[itemprop="description"]');
    if (descElement) {
      newData.description = descElement.text.trim();
      console.log(
        `[DEBUG] Tsurumai - Description found: ${newData.description.substring(
          0,
          100
        )}...`
      );
    } else {
      console.log("[DEBUG] Tsurumai - Description element not found");
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
            console.log(
              `[DEBUG] Tsurumai - ${key} found: ${content.substring(0, 50)}...`
            );
          } else {
            console.log(`[DEBUG] Tsurumai - DD element not found for ${key}`);
          }
        } else {
          console.log(`[DEBUG] Tsurumai - DT element not found for ${key}`);
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

    console.log("[DEBUG] Tsurumai - Final scraping result:");
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("[DEBUG] Tsurumai - Error in scrapeTsurumai:", error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.log(
          `[DEBUG] Tsurumai - Response status: ${axiosError.response.status}`
        );
        console.log(
          `[DEBUG] Tsurumai - Response data: ${JSON.stringify(
            axiosError.response.data
          )}`
        );
      }
      throw new AppError(
        `Error scraping Tsurumai: ${axiosError.message}`,
        axiosError.response?.status || 500,
        {
          singleProductJan,
          rule,
          responseStatus: axiosError.response?.status,
          responseData: axiosError.response?.data,
        }
      );
    }
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
