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
  product_list: any[];
  cost_list: any[];
  approval_category: string;
  manufacturing_cost_tax_rate: string;
}

export function processScrapedData(scrapedData: any[]): ProcessedItem[] {
  const groupedData: { [key: string]: ProcessedItem } = {};

  scrapedData.forEach((item: any) => {
    const groupKey = item.groupProductName || '';

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = {
        manager: ['admin@vivionblue.com'],
        campaign_code: 'PL00030',
        campaign_name: '202404_大プラホビー',
        ip_code: 'OU',
        ip_name: '創彩少女庭園',
        group_product_name: groupKey,
        size_info: item.specifications || '',
        other_info: item.description || '',
        release_date: item.releaseDate ? new Date(item.releaseDate).toISOString().split('T')[0] : '',
        delivery_date: item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : '',
        product_form: item.productForm || '',
        product_subcategory: item.productSubcategory || '',
        product_list: [],
        cost_list: [],
        approval_category: 'viviON',
        manufacturing_cost_tax_rate: '10%'
      };
    } else {
      groupedData[groupKey].size_info += '\n' + (item.specifications || '');
      groupedData[groupKey].other_info += '\n' + (item.description || '');
    }

    groupedData[groupKey].product_list.push({
      variation_name: item.variationName || '',
      jan_code: item.singleProductJan || '',
      box_jan_code: item.boxJan || '',
      original_unit_price: item.singleProductWholesalePriceIncTax ? item.singleProductWholesalePriceIncTax.toString() : '0',
      unit_price_ex_tax: item.singleProductSalePriceExTax ? item.singleProductSalePriceExTax.toString() : '0',
      country_of_origin: item.countryOfOrigin || '',
      size_variation: 'なし',
      type_count: item.typeCount ? item.typeCount.toString() : '0',
      single_product_delivery_count: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0',
      box_unit_count: item.boxUnitCount ? item.boxUnitCount.toString() : '0',
      total_production_count: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0',
      planned_sales_count: item.singleProductDeliveryCount ? item.singleProductDeliveryCount.toString() : '0',
    });

    groupedData[groupKey].cost_list.push({
      // company_name: item.supplier || '',
      company_name: '株式会社大阪プラスチックモデル' || '',
      cost_including_tax: item.purchasingCostIncTax || '',
    });
  });

  return Object.values(groupedData);
}
