const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const { fmtPrice } = require('../../utils/format');

Page({
  data: {
    theme: 'light',
    cat: null,
    subs: [], activeSub: '全部',
    subName: '', subCount: '',
    list: [],
  },

  onLoad(options) {
    this._catId = (options && options.id) || '';
    this.load();
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onCatalog = () => this.load();
    store.on('theme', this._onTheme);
    store.on('catalog', this._onCatalog);
  },
  load() {
    Promise.all([api.getCategories(), api.getProducts()]).then(res => {
      const cat = res[0].find(c => c.id === this._catId) || res[0][0];
      this._all = res[1];
      wx.setNavigationBarTitle({ title: cat.name });
      this.setData({ cat, subs: ['全部'].concat(cat.subs) });
      this.render();
    });
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current() });
  },
  onUnload() {
    store.off('theme', this._onTheme);
    store.off('catalog', this._onCatalog);
  },

  render() {
    const { cat, activeSub } = this.data;
    const list = (activeSub === '全部'
      ? this._all.filter(p => p.cat === cat.id)
      : this._all.filter(p => p.cat === cat.id && p.sub === activeSub)
    ).map((p, i) => Object.assign({}, p, {
      priceText: fmtPrice(p.price),
      delay: Math.min(i * 35, 280),
      fav: store.isFav(p.id),
    }));
    this.setData({
      list,
      subName: activeSub === '全部' ? cat.name + ' · 全部' : activeSub,
      subCount: list.length + ' 件',
    });
  },

  onSub(e) {
    const sub = e.currentTarget.dataset.sub;
    if (sub === this.data.activeSub) return;
    this.setData({ activeSub: sub });
    this.render();
  },

  onOpen(e) {
    wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
  },
});
