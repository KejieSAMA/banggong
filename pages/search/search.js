const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');
const { fmtPrice, fmtSold } = require('../../utils/format');

/* 搜索命中高亮色（rich-text 内联样式无法引用 CSS 变量，按主题取字面值） */
const MARK_STYLE = {
  light: 'background:#DEE0FF;color:#0B1A7A;border-radius:6rpx;padding:0 4rpx;',
  dark: 'background:#2B3D9C;color:#DEE0FF;border-radius:6rpx;padding:0 4rpx;',
};

function hlNodes(text, kw, themeName) {
  if (!kw) return [{ type: 'text', text }];
  const nodes = [];
  let rest = text;
  let i = rest.indexOf(kw);
  while (i > -1) {
    if (i > 0) nodes.push({ type: 'text', text: rest.slice(0, i) });
    nodes.push({ name: 'span', attrs: { style: MARK_STYLE[themeName] || MARK_STYLE.light }, children: [{ type: 'text', text: kw }] });
    rest = rest.slice(i + kw.length);
    i = rest.indexOf(kw);
  }
  if (rest) nodes.push({ type: 'text', text: rest });
  return nodes;
}

Page({
  data: {
    theme: 'light',
    kw: '', showClr: false,
    mode: 'idle',               // idle | empty | results
    history: [], hot: [],
    results: [], countText: '',
    hotChips: [],
  },

  onLoad() {
    this._cats = {};
    this._products = [];
    api.getCategories().then(cats => {
      this._cats = {};
      cats.forEach(c => { this._cats[c.id] = c.name; });
    });
    api.getProducts().then(list => { this._products = list; });
    api.getHotKeywords().then(hot => this.setData({ hot, hotChips: hot.slice(0, 4) }));
    this.renderIdle();
    this._onSearch = () => this.renderIdle();
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('search', this._onSearch);
    store.on('theme', this._onTheme);
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current() });
  },
  onUnload() {
    store.off('search', this._onSearch);
    store.off('theme', this._onTheme);
  },

  renderIdle() {
    this.setData({ mode: 'idle', history: store.get('searchHistory') });
  },

  renderResults(q) {
    const list = this._products.filter(p =>
      p.name.includes(q) || p.sub.includes(q)
      || (this._cats[p.cat] || '').includes(q) || p.brand.includes(q)
    );
    if (!list.length) {
      this.setData({ mode: 'empty' });
      return;
    }
    const t = theme.current();
    this.setData({
      mode: 'results',
      countText: '共找到 ' + list.length + ' 件相关商品',
      results: list.map((p, i) => ({
        id: p.id, img: p.img,
        nodes: hlNodes(p.name, q, t),
        brandLine: p.brand + ' · ' + p.sub,
        priceText: fmtPrice(p.price),
        soldText: '已售' + fmtSold(p.sold),
        delay: Math.min(i * 25, 250),
      })),
    });
  },

  doSearch(q) {
    q = (q || '').trim();
    if (!q) { this.renderIdle(); return; }
    store.addSearch(q);
    this.renderResults(q);
  },

  onInput(e) {
    const v = e.detail.value;
    this.setData({ kw: v, showClr: !!v });
    if (v.trim()) this.renderResults(v.trim());
    else this.renderIdle();
  },
  onConfirm(e) {
    this.doSearch(e.detail.value);
  },
  onClearInput() {
    this.setData({ kw: '', showClr: false });
    this.renderIdle();
  },
  onQuick(e) {
    const kw = e.currentTarget.dataset.id;
    this.setData({ kw, showClr: true });
    this.doSearch(kw);
  },
  onClearHistory() {
    store.clearSearch();
    ui.toast(this, '搜索历史已清空');
  },
  onReset() { this.setData({ kw: '', showClr: false }); this.renderIdle(); },
  onCancel() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  onOpen(e) { wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id }); },
});
