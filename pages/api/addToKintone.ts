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
      baseUrl: 'https://vivion.cybozu.com',
      auth: { apiToken: process.env.KINTONE_API_TOKEN },
    });

    const addedRecords = await Promise.all(
      scrapedData.map(async (item: any) => {
        const records = {
          商品名: { value: item.productName },
          JAN: { value: item.janCode },
          説明: { value: item.description || '' },
          内容物: { value: item.contents || '' },
          スケール: { value: item.scale || '' },
          仕様: { value: item.specifications || '' },
          // Add more fields as needed
        };

        const result = await client.record.addRecords({
          app: process.env.KINTONE_APP_ID!,
          records: [records],
        });

        return {
          ...item,
          records: [result.records],
        };
      })
    );

    res.status(200).json(addedRecords);
  } catch (error) {
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message });
  }
}
