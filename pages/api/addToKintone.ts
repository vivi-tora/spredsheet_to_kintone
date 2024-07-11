import type { NextApiRequest, NextApiResponse } from 'next';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { AppError, handleApiError } from '../../lib/errorHandling';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const scrapedData = req.body;

  try {
    const client = new KintoneRestAPIClient({
      baseUrl: process.env.KINTONE_BASE_URL,
      auth: {
        apiToken: [
          process.env.KINTONE_API_TOKEN_EXTERNAL_PURCHASE,
          process.env.KINTONE_API_TOKEN_IP_MASTER,
          process.env.KINTONE_API_TOKEN_STRATEGY_MANAGEMENT,
          process.env.KINTONE_API_TOKEN_PRODUCT_CATEGORY_MASTER
        ]
      },
    });

    console.log("Converted scrapedData JSON:", JSON.stringify(scrapedData, null, 2));

    const records = scrapedData.map((item: any) => ({
      担当者: {
        value: [
          {
            code: 'admin@vivionblue.com',
          },
        ],
      },
      施策コード: { value: 'PL00030' },
      施策名称: { value: '202404_大プラホビー' },
      IPコード: { value: 'OU' },
      IP名称: { value: '創彩少女庭園' },
      グループ商品名: { value: item.groupProductName || '' },
      サイズ情報: { value: (item.scale || '') + (item.specifications || '') },
      その他情報: { value: (item.description || '') + (item.contents || '') },
      発売日: { value: item.releaseDate ? new Date(item.releaseDate).toISOString().split('T')[0] : '' },
      商品サブカテゴリ: { value: item.productSubcategory || '' },
      商品一覧: {
        value: [
          {
            value: {
              バリエーション名称: { value: item.variationName || '' },
              JANコード: { value: item.singleProductJan || '' },
              BOXJANコード: { value: item.boxJan || '' },
              原単価: { value: item.singleProductWholesalePriceIncTax ? item.singleProductWholesalePriceIncTax.toString() : '0' },
              単価税抜: { value: item.singleProductSalePriceExTax ? item.singleProductSalePriceExTax.toString() : '0' },
              サイズ展開: { value: 'なし' },
              種類数: { value: item.typeCount ? item.typeCount.toString() : '0' },
              単品内入数: { value: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0' },
              BOX単品入数: { value: item.boxUnitCount ? item.boxUnitCount.toString() : '0' },
              総製造数: { value: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0' },
              販売予定数: { value: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0' },
            }
          }
        ]
      },
      費用一覧: {
        value: [
          {
            value: {
              費用税込: { value: item.purchasingCostIncTax || '' },
            }
          }
        ]
      },
    }));

    console.log(records);
    // console.log("Converted Records JSON:", JSON.stringify(records, null, 2));

    const result = await client.record.addAllRecords({
      app: process.env.KINTONE_APP_ID!,
      records: records,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error details:', JSON.stringify(error, null, 2));
    const { statusCode, message } = handleApiError(error as any);
    res.status(statusCode).json({ message, error: (error as any).errors });
  }
}
