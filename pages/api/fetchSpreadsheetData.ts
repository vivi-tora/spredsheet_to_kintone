import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { AppError, handleApiError } from "../../lib/errorHandling";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_WEBAPP_URL;
const BATCH_SIZE = 50; // バッチサイズを設定（必要に応じて調整してください）

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!GAS_URL) {
      throw new AppError(
        "NEXT_PUBLIC_GAS_WEBAPP_URL is not defined in environment variables",
        500
      );
    }

    const response = await axios.get(GAS_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      throw new AppError("データがありません", 404);
    }

    const filteredData = data.filter(
      (row) => row.Kintone === "未" && row["情報"] === "確"
    );

    if (filteredData.length === 0) {
      throw new AppError("未・確のデータがありません", 404);
    }

    const formattedData = filteredData.map((row) => ({
      kintoneStatus: row["Kintone"],
      infoStatus: row["情報"],
      incomingSchedule: row["入庫予定"],
      deliveryCategory: row["納品区分"],
      additionalRegistration: row["追加登録"],
      incomingUnit: row["入庫単位"],
      reservationDeadline: row["予約締切"],
      singleProductCode: row["単品\n商品コード"],
      singleProductJan: row["単品JAN"],
      boxProductCode: row["BOX\n商品コード"],
      boxJan: row["BOXJAN"],
      boxUnitCount: row["BOX単品入数"],
      countryOfOrigin: row["原産国"],
      productName: row["商品名"],
      groupProductName: row["グループ商品名"],
      variationName: row["バリエーション名称"],
      productForm: row["商品形態"],
      typeCount: row["種類数"],
      releaseDate: row["発売日"],
      deliveryDate: row["納品日"],
      specifiedReleaseDate: row["指定発売日\n（未来の日付指定）"],
      brand: row["ブランド"],
      series: row["シリーズ"],
      productSubcategory: row["商品サブカテゴリ"],
      workTitle: row["作品タイトル名"],
      detailedWorkTitle: row["作品・タイトル名\n（詳細な名前）"],
      applicableTaxRate: row["適用\n税率"],
      shippingDate: row["出荷日"],
      supplier: row["仕入先"],
      singleProductJanAgain: row["単品\nJAN"],
      receiptProductName: row["伝票上\n商品名"],
      reservation: row["予約"],
      singleProductDeliveryCount: row["単品\n納品数"],
      singleProductSalePriceExTax: row["単品\n販売価格（税抜）"],
      singleProductWholesalePriceExTax: row["単品\n卸価格（税抜）"],
      singleProductWholesalePriceIncTax: row["単品\n卸価格（税込）"],
      purchasingCostIncTax: row["仕入\n費用（税込）"],
      miyashitaAmountConfirmation: row["宮下\n金額確認用"],
      remarks: row["備考"],
      specifications: "\n\n" + "--- " + row["バリエーション名称"] + " ---",
      description: "\n\n" + "--- " + row["バリエーション名称"] + " ---",
    }));

    // バッチ処理の実装
    const batches = [];
    for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
      batches.push(formattedData.slice(i, i + BATCH_SIZE));
    }

    res.status(200).json({
      batches,
      totalItems: formattedData.length,
      totalBatches: batches.length,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message });
  }
}
