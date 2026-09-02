const api = require('../../../utils/api');
const store = require('../../../utils/store');
const theme = require('../../../utils/theme');
const ui = require('../../../utils/ui');
const env = require('../../../config/env');

const displayImg = img => /^(https?:|data:)/.test(img || '') ? img : (env.IMAGES_BASE + '/images/' + img);

Page({
  data: {
    theme: 'light',
    /* Banner */
    banners: [],          // [{img, t1, t2, imgDisplay}]
    uploading: false,
    /* 热搜词 */
    words: [],
    wordInput: '',
    saving: false,
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
    api.getAdminBanners().then(rows => {
      this.setData({
        banners: (rows || []).map(b => ({
          img: b.img || '',
          imgDisplay: displayImg(b.img),
          t1: b.t1 || '',
          t2: b.t2 || '',
        })),
      });
    }).catch(e => ui.toast(this, e.message || '轮播加载失败'));
    api.getAdminHotKeywords().then(words => this.setData({ words: words || [] }))
      .catch(() => {});
  },

  /* —— Banner 编辑 —— */
  onBannerField(e) {
    const { i, f } = e.currentTarget.dataset;
    this.setData({ ['banners[' + i + '].' + f]: e.detail.value });
  },
  onBannerRemove(e) {
    const i = e.currentTarget.dataset.i;
    const banners = this.data.banners.slice();
    banners.splice(i, 1);
    this.setData({ banners });
  },
  onBannerAdd() {
    if (this.data.banners.length >= 10) { ui.toast(this, '最多 10 条'); return; }
    this.setData({ banners: this.data.banners.concat([{ img: '', imgDisplay: '', t1: '', t2: '' }]) });
  },
  onBannerPick(e) {
    if (this.data.uploading) return;
    const i = e.currentTarget.dataset.i;
    ui.pickImages(1, files => {
      if (!files.length) return;
      this.setData({ uploading: true });
      this.compress(files[0])
        .then(tmp => api.uploadImage(tmp))
        .then(url => {
          this.setData({ uploading: false, ['banners[' + i + '].img']: url, ['banners[' + i + '].imgDisplay']: url });
        })
        .catch(err => {
          this.setData({ uploading: false });
          ui.toast(this, err.message || '图片上传失败');
        });
    });
  },
  /* 压缩为最长边 1200px 的 JPEG（Banner 宽幅） */
  compress(url) {
    return new Promise(resolve => {
      wx.createSelectorQuery().in(this).select('#bannerCanvas').fields({ node: true }).exec(res => {
        const canvas = res && res[0] && res[0].node;
        if (!canvas) { resolve(url); return; }
        const img = canvas.createImage();
        img.onload = () => {
          const MAX = 1200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          wx.canvasToTempFilePath({
            canvas, fileType: 'jpg', quality: 0.85,
            success: r => resolve(r.tempFilePath),
            fail: () => resolve(url),
          });
        };
        img.onerror = () => resolve(url);
        img.src = url;
      });
    });
  },

  /* —— 热搜词编辑 —— */
  onWordInput(e) { this.setData({ wordInput: e.detail.value }); },
  onWordAdd() {
    const w = (this.data.wordInput || '').trim();
    if (!w) return;
    if (this.data.words.indexOf(w) > -1) { ui.toast(this, '已存在'); return; }
    if (this.data.words.length >= 20) { ui.toast(this, '最多 20 个'); return; }
    this.setData({ words: this.data.words.concat([w]), wordInput: '' });
  },
  onWordRemove(e) {
    const i = e.currentTarget.dataset.i;
    const words = this.data.words.slice();
    words.splice(i, 1);
    this.setData({ words });
  },

  /* —— 保存（全量替换） —— */
  onSave() {
    if (this.data.saving) return;
    const banners = this.data.banners.filter(b => b.img);
    if (!banners.length) { ui.toast(this, '至少保留一条 Banner（需有图片）'); return; }
    this.setData({ saving: true });
    Promise.all([
      api.saveBanners(banners.map(b => ({ img: b.img, t1: b.t1, t2: b.t2 }))),
      api.saveHotKeywords(this.data.words),
    ]).then(() => {
      this.setData({ saving: false });
      api.clearCatalogCache();
      store.set('catalog', Date.now());
      ui.toast(this, '已保存', 'check_circle-fill');
    }).catch(e => {
      this.setData({ saving: false });
      ui.toast(this, e.message || '保存失败');
    });
  },
});
