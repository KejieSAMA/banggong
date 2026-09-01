const api = require('../../../utils/api');
const store = require('../../../utils/store');
const theme = require('../../../utils/theme');
const ui = require('../../../utils/ui');

/* 分类图标可选集（图标库现有 mask 名） */
const ICON_OPTIONS = ['shopping_bag', 'storefront', 'print', 'menu_book', 'content_cut', 'sports_basketball', 'description', 'folder', 'inventory_2', 'redeem'];

Page({
  data: {
    theme: 'light',
    list: [],
    loading: true,
    iconOptions: ICON_OPTIONS,
    /* 编辑 sheet */
    editVisible: false,
    editTitle: '新增分类',
    editingId: '',
    draftName: '',
    iconLabels: ICON_OPTIONS,
    iconIdx: 0,
    subs: ['', ''],
    saving: false,
    delVisible: false,
    delActions: [{ label: '取消' }, { label: '删除', cls: 'primary' }],
  },

  onLoad() {
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('theme', this._onTheme);
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current() });
    this.load();
  },
  onUnload() { store.off('theme', this._onTheme); },

  load() {
    api.getAdminCategories().then(rows => {
      this._cats = rows || [];
      this.setData({
        list: this._cats.map(c => ({
          id: c.id, name: c.name, icon: c.icon || 'folder',
          subText: (c.subs || []).length ? (c.subs || []).join(' / ') : '（无二级分类）',
          count: c.productCount || 0,
        })),
        loading: false,
      });
    }).catch(e => {
      this.setData({ loading: false });
      ui.toast(this, e.message || '加载失败');
    });
  },

  /* —— 编辑 sheet —— */
  openCreate() {
    this.setData({
      editVisible: true, editTitle: '新增分类', editingId: '',
      draftName: '', iconIdx: 0, subs: ['', ''],
    });
  },
  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const c = this._cats.find(x => x.id === id);
    if (!c) return;
    const iconIdx = Math.max(0, ICON_OPTIONS.indexOf(c.icon));
    this.setData({
      editVisible: true, editTitle: '编辑分类', editingId: id,
      draftName: c.name || '',
      iconIdx,
      subs: (c.subs && c.subs.length ? c.subs : ['']).map(s => s),
    });
  },
  onEditClose() { this.setData({ editVisible: false }); },
  onNameInput(e) { this.setData({ draftName: e.detail.value }); },
  onIconChange(e) { this.setData({ iconIdx: Number(e.detail.value) || 0 }); },

  onSubInput(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ['subs[' + i + ']']: e.detail.value });
  },
  onSubAdd() { this.setData({ subs: this.data.subs.concat(['']) }); },
  onSubRemove(e) {
    const i = e.currentTarget.dataset.i;
    const subs = this.data.subs.slice();
    subs.splice(i, 1);
    this.setData({ subs: subs.length ? subs : [''] });
  },

  onSave() {
    if (this.data.saving) return;
    const name = (this.data.draftName || '').trim();
    if (!name) { ui.toast(this, '请输入分类名称'); return; }
    const body = {
      name,
      icon: ICON_OPTIONS[this.data.iconIdx] || '',
      subs: this.data.subs.map(s => s.trim()).filter(Boolean),
    };
    this.setData({ saving: true });
    const req = this.data.editingId
      ? api.updateCategory(this.data.editingId, body)
      : api.createCategory(body);
    req.then(() => {
      this.setData({ saving: false, editVisible: false });
      this.notifyCatalog();
      ui.toast(this, this.data.editingId ? '已保存' : '已创建', 'check_circle-fill');
      this.load();
    }).catch(e => {
      this.setData({ saving: false });
      ui.toast(this, e.message || '保存失败');
    });
  },

  /* —— 删除（后端有商品数保护） —— */
  onOpenDelete(e) {
    this._delId = e.currentTarget.dataset.id;
    this.setData({ delVisible: true });
  },
  onDeleteClose() { this.setData({ delVisible: false }); },
  onDeleteAction(e) {
    this.setData({ delVisible: false });
    if (e.detail.index !== 1 || !this._delId) return;
    api.deleteCategory(this._delId).then(() => {
      this.notifyCatalog();
      ui.toast(this, '已删除');
      this.load();
    }).catch(err => ui.toast(this, err.message || '删除失败'));
  },

  notifyCatalog() {
    api.clearCatalogCache();
    store.set('catalog', Date.now());
  },
});
