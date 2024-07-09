export const scrapingRules = {
  tsuruHobby: {
    url: 'https://tsurumai-hobby.jp/item/{janCode}',
    selectors: {
      description: 'p[itemprop="description"]',
      contents: 'dt:contains("内容物/付属品") + dd',
      scale: 'dt:contains("スケール") + dd',
    },
  },
  amiami: {
    url: 'https://slist.amiami.jp/top/search/list?s_keywords={janCode}',
    productLinkSelector: '.product_box a',
    selectors: {
      specifications: 'p.heading_07:contains("製品仕様") + p.box_01',
      description: 'p.heading_07:contains("解説") + p.box_01',
    },
  },
};
