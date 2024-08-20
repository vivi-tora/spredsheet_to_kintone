import type { NextApiRequest, NextApiResponse } from 'next';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { AppError, handleApiError } from '../../lib/errorHandling';

interface ProcessedItem {
  manager: string[];
  campaign_code: string;
  campaign_name: string;
  ip_code: string;
  ip_name: string;
  group_product_name: string;
  size_info: string;
  other_info: string;
  release_date: string;
  delivery_date: string;
  product_form: string;
  product_subcategory: string;
  product_list: ProductItem[];
  cost_list: CostItem[];
  approval_category: string;
  manufacturing_cost_tax_rate: string;
}

interface ProductItem {
  variation_name: string;
  jan_code: string;
  box_jan_code: string;
  original_unit_price: string;
  unit_price_ex_tax: string;
  country_of_origin: string;
  size_variation: string;
  type_count: string;
  single_product_delivery_count: string;
  box_unit_count: string;
  total_production_count: string;
  planned_sales_count: string;
}

interface CostItem {
  company_name: string;
  cost_including_tax: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('Received data:', JSON.stringify(req.body, null, 2));

  const processedData = req.body as ProcessedItem[];

  if (!Array.isArray(processedData) || processedData.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty data received' });
  }

  try {
    const client = new KintoneRestAPIClient({
      baseUrl: process.env.KINTONE_BASE_URL,
      auth: {
        apiToken: [
          process.env.KINTONE_API_TOKEN_EXTERNAL_PURCHASE,
          process.env.KINTONE_API_TOKEN_IP_MASTER,
          process.env.KINTONE_API_TOKEN_STRATEGY_MANAGEMENT,
          process.env.KINTONE_API_TOKEN_PRODUCT_CATEGORY_MASTER,
          process.env.KINTONE_API_TOKEN_CLIENT,
        ].filter((token): token is string => typeof token === 'string')
      },
    });

    const records = processedData.map((item: ProcessedItem) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid item in processedData');
      }

      return {
        担当者: {
          value: Array.isArray(item.manager)
            ? item.manager.map((code: string) => ({ code }))
            : [],
        },
        施策コード: { value: item.campaign_code || '' },
        施策名称: { value: item.campaign_name || '' },
        IPコード: { value: item.ip_code || '' },
        IP名称: { value: item.ip_name || '' },
        グループ商品名: { value: item.group_product_name || '' },
        サイズ情報: { value: item.size_info || '' },
        その他情報: { value: item.other_info || '' },
        発売日: { value: item.release_date || '' },
        納品日: { value: item.delivery_date || '' },
        商品形態: { value: item.product_form || '' },
        商品サブカテゴリ: { value: item.product_subcategory || '' },
        商品一覧: {
          value: Array.isArray(item.product_list)
            ? item.product_list.map(product => ({
                value: {
                  バリエーション名称: { value: product.variation_name || '' },
                  JAN: { value: product.jan_code || '' },
                  BOXJAN: { value: product.box_jan_code || '' },
                  原単価: { value: product.original_unit_price || '' },
                  単価税抜: { value: product.unit_price_ex_tax || '' },
                  原産国: { value: product.country_of_origin || '' },
                  サイズ展開: { value: product.size_variation || '' },
                  種類数: { value: product.type_count || '' },
                  単品内入数: { value: product.single_product_delivery_count || '' },
                  BOX単品入数: { value: product.box_unit_count || '' },
                  総製造数: { value: product.total_production_count || '' },
                  販売予定数: { value: product.planned_sales_count || '' },
                }
              }))
            : [],
        },
        費用一覧: {
          value: Array.isArray(item.cost_list)
            ? item.cost_list.map(cost => ({
                value: {
                  企業名称: { value: cost.company_name || '' },
                  費用税込: { value: cost.cost_including_tax || '' },
                }
              }))
            : [],
        },
        稟議区分: { value: item.approval_category || '' },
        製造費税率: { value: item.manufacturing_cost_tax_rate || '' }
      };
    });

    console.log('Prepared records:', JSON.stringify(records, null, 2));

    const result = await client.record.addAllRecords({
      app: process.env.KINTONE_APP_ID!,
      records: records,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error details:', JSON.stringify(error, null, 2));
    const { statusCode, message } = handleApiError(error as Error);
    res.status(statusCode).json({ message, error: (error as any).errors });
  }
}
