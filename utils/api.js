/* ============================================================
   API 层（三模式自动选择 + 本地兜底）
   1. BASE_URL 非空  → wx.request 直连
   2. CLOUD.env 非空 → wx.cloud.callContainer（云托管免鉴权，自动携带 openid）
   3. 失败/未配置     → 回落 data/db.js 本地数据（仅目录接口；用户接口由 store 决定是否调用）
   契约：统一返回 { code, data, msg }，code === 0 成功，code === 1 未登录/库未就绪
   图片：后端返回 /images/* 相对路径，此处拼接公网域名；
        本地兜底指向小程序包内 /images/
   ============================================================ */
const env = require('../config/env');
const db = require('../data/db');

const LOCAL_IMG = '/images/';
let productsCache = null; // 商品列表缓存（详情页图集推算复用）

/* 远端图片相对路径 → 完整 URL（直连用 BASE_URL，云托管用公网域名） */
function imgBase() {
  return env.BASE_URL || env.IMAGES_BASE || '';
}
function resolveImg(item) {
  if (item.img && item.img.indexOf('http') !== 0) {
    return Object.assign({}, item, { img: imgBase() + item.img });
  }
  return item;
}
const resolveList = list => list.map(resolveImg);

function httpRequest(path, { method = 'GET', data } = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: env.BASE_URL + env.API_PREFIX + path,
      method,
      data,
      timeout: env.TIMEOUT,
      success(res) {
        const d = res.data;
        if (d && d.code === 0) resolve(d.data);
        else reject(new Error((d && d.msg) || ('接口返回异常 ' + res.statusCode)));
      },
      fail: err => reject(new Error(err.errMsg || '网络请求失败')),
    });
  });
}

function cloudRequest(path, { method = 'GET', data } = {}) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callContainer) {
      reject(new Error('当前环境不支持 callContainer'));
      return;
    }
    wx.cloud.callContainer({
      config: { env: env.CLOUD.env },
      path: env.API_PREFIX + path,
      header: { 'X-WX-SERVICE': env.CLOUD.service },
      method,
      data,
      success(res) {
        const d = res.data;
        if (d && d.code === 0) resolve(d.data);
        else reject(new Error((d && d.msg) || ('callContainer 返回异常 ' + res.statusCode)));
      },
      fail: err => reject(new Error(err.errMsg || 'callContainer 调用失败')),
    });
  });
}

function remote(path, opts) {
  if (env.BASE_URL) return httpRequest(path, opts);
  if (env.CLOUD && env.CLOUD.env) return cloudRequest(path, opts);
  return Promise.reject(new Error('未配置后端'));
}

function withFallback(path, localData, resolve) {
  return remote(path)
    .then(data => (resolve ? resolve(data) : data))
    .catch(e => {
      console.warn('[api]', path, e.message, '→ 本地数据兜底');
      return localData();
    });
}

/* —— 目录（带本地兜底） —— */
module.exports = {
  getBanners() {
    return withFallback('/banners',
      () => db.BANNERS.map(b => Object.assign({}, b, { img: LOCAL_IMG + b.img })),
      resolveList);
  },
  getCategories() {
    return withFallback('/categories', () => db.CATS);
  },
  getProducts() {
    return withFallback('/products',
      () => {
        productsCache = db.PRODUCTS.map(p => Object.assign({}, p, { img: LOCAL_IMG + p.img }));
        return productsCache;
      },
      list => {
        productsCache = resolveList(list);
        return productsCache;
      });
  },
  getProduct(id) {
    return withFallback('/products/' + id,
      () => {
        const list = productsCache || (productsCache = db.PRODUCTS.map(p => Object.assign({}, p, { img: LOCAL_IMG + p.img })));
        return list.find(p => p.id === id) || null;
      },
      p => (p ? resolveImg(p) : null));
  },
  getHotKeywords() {
    return withFallback('/hot-keywords', () => db.HOT_KEYWORDS);
  },

  /* —— 用户体系（无本地兜底；code:1/失败由 store 处理为本地模式） —— */
  getProfile: () => remote('/user/profile'),
  saveProfile: data => remote('/user/profile', { method: 'PUT', data }),
  getFavorites: () => remote('/favorites'),
  saveFavorites: ids => remote('/favorites', { method: 'POST', data: { ids } }),
  getHistory: () => remote('/history'),
  pushHistory: id => remote('/history', { method: 'POST', data: { id } }),
  clearHistory: () => remote('/history', { method: 'DELETE' }),
  getSearchHistory: () => remote('/search-history'),
  pushSearch: q => remote('/search-history', { method: 'POST', data: { q } }),
  clearSearch: () => remote('/search-history', { method: 'DELETE' }),
};
