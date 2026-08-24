const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');
const { fmtPrice, fmtSold } = require('../../utils/format');

Page({
  data: {
    theme: 'light', list: [], countText: '',
    editing: false,
    clearVisible: false,
    clearActions: [{ label: '取消' }, { label: '清空', cls: 'primary' }],
  },

  onLoad() {
    this.load();
    this._onHistory = () => this.render();
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onCatalog = () => this.load();
    store.on('history', this._onHistory);
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
    store.off('history', this._onHistory);
    store.off('theme', this._onTheme);
    store.off('catalog', this._onCatalog);
  },

  render() {
    if (!this._all) return;
    const list = store.get('history')
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

  /* 编辑模式：单条删除 */
  onToggleEdit() { this.setData({ editing: !this.data.editing }); },
  onRemove(e) {
    store.removeHistory(e.currentTarget.dataset.id);
    ui.toast(this, '已删除');
    if (this.data.list.length <= 1) this.setData({ editing: false }); // 删空自动退出编辑
  },

  onOpenClear() { this.setData({ clearVisible: true }); },
  onClearClose() { this.setData({ clearVisible: false }); },
  onClearAction(e) {
    this.setData({ clearVisible: false });
    if (e.detail.index === 1) {
      store.clearHistory();
      ui.toast(this, '足迹已清空');
    }
  },
  onGoMall() { wx.switchTab({ url: '/pages/mall/mall' }); },
});
