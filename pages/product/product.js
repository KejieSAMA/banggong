const api = require('../../utils/api');
const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');
const { fmtPrice, fmtSold } = require('../../utils/format');

Page({
  data: {
    theme: 'light',
    p: null, notFound: false,
    priceText: '', origText: '',
    specs: [],
    imgs: [], imgIdx: 0, galleryLen: 0,
    soldText: '',
    related: [],
    favOn: false,
    shareVisible: false,
    serviceVisible: false,
  },

  onLoad(options) {
    const id = (options && options.id) || '';
    this._pid = id;
    this.load();
    this._onFav = () => this.setData({ favOn: store.isFav(id) });
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onCatalog = () => this.load();
    store.on('fav', this._onFav);
    store.on('theme', this._onTheme);
    store.on('catalog', this._onCatalog);
  },
  load() {
    api.getProduct(this._pid).then(p => {
      if (!p) {
        this.setData({ notFound: true });
        return;
      }
      store.addHistory(p.id);
      api.getProducts().then(all => this.build(p, all));
    });
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

  build(p, all) {
    /* 图集：商品真实图集（images，首张即主图），不再借用其他商品图凑数 */
    const imgs = Array.isArray(p.images) && p.images.length ? p.images : [p.img];
    const related = all.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4)
      .map((x, i) => Object.assign({}, x, { fav: store.isFav(x.id), delay: Math.min(i * 30, 300) }));
    this.setData({
      p,
      priceText: fmtPrice(p.price),
      origText: p.orig ? '¥' + fmtPrice(p.orig) : '',
      soldText: '已售 ' + fmtSold(p.sold),
      specs: [['品牌', p.brand], ['分类', p.sub]].concat(p.specs || []),
      imgs, galleryLen: imgs.length,
      related,
      favOn: store.isFav(p.id),
    });
  },

  onGallery(e) { this.setData({ imgIdx: e.detail.current }); },

  onCardFav(e) {
    if (!ui.loginGuard()) return;
    const added = store.toggleFav(e.detail.id);
    ui.toast(this, added ? '已加入收藏' : '已取消收藏', added ? 'favorite-fill' : '');
  },

  handleAct(e) {
    const act = e.currentTarget.dataset.act;
    if (act === 'go-mall') wx.switchTab({ url: '/pages/mall/mall' });
    else if (act === 'open-product') wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
    else if (act === 'toggle-fav') {
      if (!ui.loginGuard()) return;
      const added = store.toggleFav(this.data.p.id);
      ui.toast(this, added ? '已加入收藏' : '已取消收藏', added ? 'favorite-fill' : '');
    } else if (act === 'add-list') ui.toast(this, '原型演示：仅商品展示，未接入下单');
    else if (act === 'open-share') this.setData({ shareVisible: true });
    else if (act === 'open-service') this.setData({ serviceVisible: true });
  },

  /* 分享 */
  onShareClose() { this.setData({ shareVisible: false }); },
  onShareTap(e) {
    const type = e.currentTarget.dataset.share;
    this.setData({ shareVisible: false });
    if (type === '复制链接') {
      wx.setClipboardData({
        data: 'https://bangong.example.com/p/' + (this.data.p ? this.data.p.id : ''),
        success: () => ui.toast(this, '链接已复制到剪贴板', 'check_circle-fill'),
      });
    }
  },
  onShareAppMessage() {
    const p = this.data.p;
    return {
      title: p ? p.name : '办公严选',
      path: '/pages/product/product?id=' + (p ? p.id : ''),
      imageUrl: p ? p.img : '',
    };
  },

  /* 客服 */
  onServiceClose() { this.setData({ serviceVisible: false }); },
  onService(e) {
    const type = e.currentTarget.dataset.svc;
    this.setData({ serviceVisible: false });
    if (type === '电话') ui.toast(this, '客服热线：400-800-1234');
    else ui.toast(this, '原型演示：在线客服未接入');
  },
});
