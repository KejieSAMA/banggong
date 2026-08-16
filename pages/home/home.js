const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');

Page({
  data: { theme: 'light', banners: [], cats: [], hot: [], bannerIdx: 0 },

  onLoad() {
    this.refresh();
    this._onFav = () => this.syncFav();
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('fav', this._onFav);
    store.on('theme', this._onTheme);
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().init(0);
    theme.syncNav();
    this.setData({ theme: theme.current() });
  },
  onUnload() {
    store.off('fav', this._onFav);
    store.off('theme', this._onTheme);
  },

  refresh() {
    Promise.all([api.getBanners(), api.getCategories(), api.getProducts()]).then(res => {
      const hot = res[2].filter(p => p.tag === 'hot').slice(0, 8)
        .map((p, i) => Object.assign({}, p, { fav: store.isFav(p.id), delay: Math.min(i * 30, 300) }));
      this.setData({ banners: res[0], cats: res[1], hot });
    });
  },
  syncFav() {
    this.setData({
      hot: this.data.hot.map(p => Object.assign({}, p, { fav: store.isFav(p.id) })),
    });
  },

  onBannerChange(e) { this.setData({ bannerIdx: e.detail.current }); },

  onCardFav(e) {
    const added = store.toggleFav(e.detail.id);
    ui.toast(this, added ? '已加入收藏' : '已取消收藏', added ? 'favorite-fill' : '');
  },

  handleAct(e) {
    const { act, id } = e.currentTarget.dataset;
    if (act === 'open-search') wx.navigateTo({ url: '/pages/search/search' });
    else if (act === 'go-mall') wx.switchTab({ url: '/pages/mall/mall' });
    else if (act === 'open-category') wx.navigateTo({ url: '/pages/category/category?id=' + id });
    else if (act === 'open-product') wx.navigateTo({ url: '/pages/product/product?id=' + id });
  },
});
