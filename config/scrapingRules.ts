export const scrapingRules = {
  tsuruHobby: {
    url: 'https://tsurumai-hobby.jp/item/{janCode}',
    selectors: {
      description: 'p[itemprop="description"]',
      contents: '内容物/付属品',
      scale: 'スケール',
      size: 'サイズ',
    },
  },
  amiami: {
    url: 'https://slist.amiami.jp/top/search/list?s_keywords={janCode}',
    productLinkSelector: '.product_box a',
    selectors: {
      specifications: '製品仕様',
      description: '解説',
    },
  },
};
