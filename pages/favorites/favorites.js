const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');
const { fmtPrice, fmtSold } = require('../../utils/format');

Page({
  data: { theme: 'light', list: [], countText: '' },

  onLoad() {
    this.load();
    this._onFav = () => this.render();
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onCatalog = () => this.load();
    store.on('fav', this._onFav);
    store.on('theme', this._onTheme);
    store.on('catalog', this._onCatalog);
  },
  load() {
    api.getProducts().then(all => { this._all = all; this.render(); });
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current() });
  },
  onUnload() {
    store.off('fav', this._onFav);
    store.off('theme', this._onTheme);
    store.off('catalog', this._onCatalog);
  },

  render() {
    if (!this._all) return;
    const list = store.get('favorites')
      .map(id => this._all.find(p => p.id === id))
      .filter(Boolean)
      .map((p, i) => ({
        id: p.id, img: p.img, name: p.name,
        brandLine: p.brand + ' · 已售' + fmtSold(p.sold),
        priceText: fmtPrice(p.price),
        delay: Math.min(i * 25, 250),
      }));
    this.setData({ list, countText: '共 ' + list.length + ' 件' });
  },

  onOpen(e) { wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id }); },
  onRemove(e) {
    store.removeFav(e.currentTarget.dataset.id);
    ui.toast(this, '已取消收藏');
  },
  onGoMall() { wx.switchTab({ url: '/pages/mall/mall' }); },
});
