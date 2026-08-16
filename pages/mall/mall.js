const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');

const SORT_LABELS = {
  default: '综合排序', sales: '销量优先', priceAsc: '价格从低到高',
  priceDesc: '价格从高到低', new: '上新优先',
};

function sortProducts(list, sort) {
  const l = list.slice();
  switch (sort) {
    case 'sales': return l.sort((a, b) => b.sold - a.sold);
    case 'priceAsc': return l.sort((a, b) => a.price - b.price);
    case 'priceDesc': return l.sort((a, b) => b.price - a.price);
    case 'new': return l.sort((a, b) => (b.tag === 'new') - (a.tag === 'new'));
    default: return l.sort((a, b) => b.sold - a.sold);
  }
}

Page({
  data: {
    theme: 'light',
    cats: [], activeCat: 'all',
    sortLabel: '综合排序',
    freeShipOnly: false,
    countText: '',
    list: [],
    sortVisible: false,
    sortItems: [],
    filterVisible: false,
    shipOn: false,
  },

  onLoad() {
    this._products = [];
    api.getCategories().then(cats => this.setData({ cats }));
    api.getProducts().then(products => { this._products = products; this.render(); });

    this._onFav = () => this.render();
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('fav', this._onFav);
    store.on('theme', this._onTheme);
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().init(1);
    theme.syncNav();
    this.setData({ theme: theme.current() });
  },
  onUnload() {
    store.off('fav', this._onFav);
    store.off('theme', this._onTheme);
  },

  render() {
    const sort = store.get('sort');
    const freeShip = store.get('freeShipOnly');
    let list = freeShip ? this._products.filter(p => p.tag === 'hot') : this._products;
    list = sortProducts(list, sort).map((p, i) => Object.assign({}, p, {
      fav: store.isFav(p.id), delay: Math.min(i * 30, 300),
    }));
    this.setData({
      list,
      sortLabel: SORT_LABELS[sort] || SORT_LABELS.default,
      freeShipOnly: freeShip,
      countText: '共 ' + list.length + ' 件商品' + (freeShip ? ' · 仅看包邮' : ''),
    });
  },

  onCardFav(e) {
    if (!ui.loginGuard()) return;
    const added = store.toggleFav(e.detail.id);
    ui.toast(this, added ? '已加入收藏' : '已取消收藏', added ? 'favorite-fill' : '');
  },

  handleAct(e) {
    const { act, id } = e.currentTarget.dataset;
    if (act === 'mall-chip') this.onChip(id);
    else if (act === 'open-sort') this.openSort();
    else if (act === 'open-filter') this.openFilter();
    else if (act === 'open-product') wx.navigateTo({ url: '/pages/product/product?id=' + id });
  },

  onChip(id) {
    if (id === 'all') {
      this.setData({ activeCat: 'all' });
      return;
    }
    wx.navigateTo({ url: '/pages/category/category?id=' + id });
  },

  /* 排序 */
  openSort() {
    ui.toggleTabBar(this, true);
    const cur = store.get('sort');
    this.setData({
      sortVisible: true,
      sortItems: Object.keys(SORT_LABELS).map(k => ({
        key: k, label: SORT_LABELS[k], sel: k === cur,
      })),
    });
  },
  onSortClose() {
    ui.toggleTabBar(this, false);
    this.setData({ sortVisible: false });
  },
  onSortPick(e) {
    const key = e.currentTarget.dataset.key;
    store.set('sort', key);
    this.render();
    ui.toggleTabBar(this, false);
    this.setData({ sortVisible: false });
    ui.toast(this, '已按“' + SORT_LABELS[key] + '”排序');
  },

  /* 筛选 */
  openFilter() {
    ui.toggleTabBar(this, true);
    this.setData({ filterVisible: true, shipOn: store.get('freeShipOnly') });
  },
  onFilterClose() {
    ui.toggleTabBar(this, false);
    this.setData({ filterVisible: false });
  },
  onShipToggle() { this.setData({ shipOn: !this.data.shipOn }); },
  onFilterReset() {
    store.set('freeShipOnly', false);
    this.render();
    ui.toggleTabBar(this, false);
    this.setData({ filterVisible: false });
  },
  onFilterOk() {
    store.set('freeShipOnly', this.data.shipOn);
    this.render();
    ui.toggleTabBar(this, false);
    this.setData({ filterVisible: false });
    ui.toast(this, this.data.shipOn ? '已筛选包邮商品' : '已显示全部商品');
  },
});
