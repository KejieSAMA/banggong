const api = require('../../../utils/api');
const store = require('../../../utils/store');
const theme = require('../../../utils/theme');
const ui = require('../../../utils/ui');
const env = require('../../../config/env');

/* 管理端原始 img（相对路径或完整 URL）→ 可显示 URL */
const displayImg = img => /^(https?:|data:)/.test(img || '') ? img : (env.IMAGES_BASE + '/images/' + img);

Page({
  data: {
    theme: 'light',
    list: [],
    kw: '',
    loading: true,
    delVisible: false,
    delActions: [{ label: '取消' }, { label: '删除', cls: 'primary' }],
  },

  onLoad() {
    this._all = [];
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onCatalog = () => this.load();
    store.on('theme', this._onTheme);
    store.on('catalog', this._onCatalog);
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current() });
    this.load(); // 编辑页返回后刷新
  },
  onUnload() {
    store.off('theme', this._onTheme);
    store.off('catalog', this._onCatalog);
  },

  load() {
    api.getAdminProducts().then(rows => {
      this._all = rows || [];
      this.render();
    }).catch(e => {
      this.setData({ loading: false });
      ui.toast(this, e.message || '加载失败');
    });
  },
  render() {
    const kw = (this.data.kw || '').trim();
    const list = this._all
      .filter(p => !kw || (p.name || '').indexOf(kw) > -1 || (p.id || '').indexOf(kw) > -1)
      .map(p => ({
        id: p.id,
        name: p.name,
        img: displayImg(p.img),
        priceText: '¥' + Number(p.price).toFixed(2),
        catLine: (p.brand ? p.brand + ' · ' : '') + (p.sub || ''),
        online: p.online !== false,
        tagText: p.tag === 'hot' ? '热卖' : (p.tag === 'new' ? '新品' : ''),
      }));
    this.setData({ list, loading: false, countText: '共 ' + list.length + ' 件' });
  },

  onKw(e) {
    this.setData({ kw: e.detail.value });
    this.render();
  },

  /* 上下架（同步公开目录） */
  onToggleOnline(e) {
    const id = e.currentTarget.dataset.id;
    const row = this._all.find(x => x.id === id);
    if (!row) return;
    const next = row.online === false; // 当前下架 → 上架
    api.updateProduct(id, { online: next }).then(() => {
      row.online = next;
      this.render();
      this.notifyCatalog();
      ui.toast(this, next ? '已上架' : '已下架');
    }).catch(err => ui.toast(this, err.message || '操作失败'));
  },

  onEdit(e) {
    wx.navigateTo({ url: '/pages/admin/product-edit/product-edit?id=' + e.currentTarget.dataset.id });
  },
  onCreate() {
    wx.navigateTo({ url: '/pages/admin/product-edit/product-edit' });
  },

  /* 删除（二次确认） */
  onOpenDelete(e) {
    this._delId = e.currentTarget.dataset.id;
    this.setData({ delVisible: true });
  },
  onDeleteClose() { this.setData({ delVisible: false }); },
  onDeleteAction(e) {
    this.setData({ delVisible: false });
    if (e.detail.index !== 1 || !this._delId) return;
    const id = this._delId;
    api.deleteProduct(id).then(() => {
      this._all = this._all.filter(x => x.id !== id);
      this.render();
      this.notifyCatalog();
      ui.toast(this, '已删除');
    }).catch(err => ui.toast(this, err.message || '删除失败'));
  },

  /* 目录变更 → 清缓存 + 广播各页重拉 */
  notifyCatalog() {
    api.clearCatalogCache();
    store.set('catalog', Date.now());
  },
});
