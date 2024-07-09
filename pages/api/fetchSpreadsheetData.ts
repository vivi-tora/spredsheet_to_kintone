import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { AppError, handleApiError } from '../../lib/errorHandling';

const GAS_URL = process.env.GAS_WEBAPP_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!GAS_URL) {
      throw new AppError('GAS_WEBAPP_URL is not defined in environment variables', 500);
    }

    const response = await axios.get(GAS_URL, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      throw new AppError('データがありません', 404);
    }

    const filteredData = data.filter(row => row.Kintone === '未' && row['情報'] === '確');

    if (filteredData.length === 0) {
      throw new AppError('未・確のデータがありません', 404);
    }

    const formattedData = filteredData.map(row => ({
      productName: row['商品名'],
      janCode: row['単品JAN'],
      kintoneStatus: row['Kintone'],
      infoStatus: row['情報'],
      // 必要に応じて他のフィールドも追加
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching data:', error);
    const { statusCode, message } = handleApiError(error);
    res.status(statusCode).json({ message });
  }
}
