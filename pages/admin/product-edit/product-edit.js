const api = require('../../../utils/api');
const store = require('../../../utils/store');
const theme = require('../../../utils/theme');
const ui = require('../../../utils/ui');
const env = require('../../../config/env');

const TAG_OPTIONS = [
  { key: '', label: '无' },
  { key: 'hot', label: '热卖' },
  { key: 'new', label: '新品' },
];

const displayImg = img => /^(https?:|data:)/.test(img || '') ? img : (env.IMAGES_BASE + '/images/' + img);

Page({
  data: {
    theme: 'light',
    isEdit: false,
    img: '',           // 展示用完整 URL
    uploading: false,
    name: '', brand: '',
    catNames: [], catIdx: 0,
    subNames: [], subIdx: 0,
    price: '', orig: '',
    tagLabels: ['无', '热卖', '新品'], tagIdx: 0,
    rating: '4.8', sold: '0', desc: '',
    specs: [{ k: '', v: '' }, { k: '', v: '' }],
    saving: false,
  },

  onLoad(options) {
    this._id = (options && options.id) || '';
    this._rawImg = ''; // 原始 img（相对路径或 URL），未换图时原样回传
    this._cats = [];
    this._online = true;
    this.setData({ isEdit: !!this._id });
    wx.setNavigationBarTitle({ title: this._id ? '编辑商品' : '新增商品' });
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('theme', this._onTheme);
    this.load();
  },
  onUnload() { store.off('theme', this._onTheme); },

  load() {
    api.getCategories().then(cats => {
      this._cats = cats || [];
      const catNames = this._cats.map(c => c.name);
      if (!this._id) {
        this.setData({ catNames });
        return;
      }
      api.getAdminProducts().then(rows => {
        const p = (rows || []).find(x => x.id === this._id);
        if (!p) { ui.toast(this, '商品不存在'); setTimeout(() => wx.navigateBack(), 800); return; }
        this._rawImg = p.img;
        this._online = p.online !== false;
        const catIdx = Math.max(0, this._cats.findIndex(c => c.id === p.cat));
        const subNames = (this._cats[catIdx] && this._cats[catIdx].subs) ? this._cats[catIdx].subs.slice() : [];
        const subIdx = Math.max(0, subNames.indexOf(p.sub));
        const tagIdx = TAG_OPTIONS.findIndex(t => t.key === (p.tag || ''));
        this.setData({
          catNames, catIdx, subNames, subIdx,
          img: displayImg(p.img),
          name: p.name || '', brand: p.brand || '',
          price: p.price != null ? String(Number(p.price)) : '',
          orig: p.orig != null ? String(Number(p.orig)) : '',
          tagIdx: tagIdx < 0 ? 0 : tagIdx,
          rating: p.rating != null ? String(p.rating) : '4.8',
          sold: String(p.sold || 0),
          desc: p.desc || '',
          specs: (p.specs && p.specs.length ? p.specs : [['', ''], ['', '']]).map(s => ({ k: s[0], v: s[1] })),
        });
      }).catch(e => ui.toast(this, e.message || '加载失败'));
    });
  },

  /* —— 表单输入 —— */
  onField(e) {
    const f = e.currentTarget.dataset.f;
    if (f) this.setData({ [f]: e.detail.value });
  },
  onCatChange(e) {
    const catIdx = Number(e.detail.value) || 0;
    const subs = (this._cats[catIdx] && this._cats[catIdx].subs) ? this._cats[catIdx].subs.slice() : [];
    this.setData({ catIdx, subNames: subs, subIdx: 0 });
  },
  onSubChange(e) { this.setData({ subIdx: Number(e.detail.value) || 0 }); },
  onTagChange(e) { this.setData({ tagIdx: Number(e.detail.value) || 0 }); },

  onSpecK(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ['specs[' + i + '].k']: e.detail.value });
  },
  onSpecV(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ['specs[' + i + '].v']: e.detail.value });
  },
  onSpecAdd() { this.setData({ specs: this.data.specs.concat([{ k: '', v: '' }]) }); },
  onSpecRemove(e) {
    const i = e.currentTarget.dataset.i;
    const specs = this.data.specs.slice();
    specs.splice(i, 1);
    this.setData({ specs: specs.length ? specs : [{ k: '', v: '' }] });
  },

  /* —— 选图：相册 → 离屏 canvas 压缩 → OSS 直传 —— */
  onPickImage() {
    if (this.data.uploading) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const f = res.tempFiles && res.tempFiles[0];
        if (f) this.compressAndUpload(f.tempFilePath);
      },
    });
  },
  compressAndUpload(filePath) {
    this.setData({ uploading: true });
    this.compress(filePath).then(tmp => api.uploadImage(tmp)).then(url => {
      this._rawImg = url;
      this.setData({ img: url, uploading: false });
    }).catch(e => {
      this.setData({ uploading: false });
      ui.toast(this, e.message || '图片上传失败');
    });
  },
  /* 压缩为最长边 800px 的 JPEG（商品图清晰度与流量折中） */
  compress(url) {
    return new Promise(resolve => {
      wx.createSelectorQuery().in(this).select('#editCanvas').fields({ node: true }).exec(res => {
        const canvas = res && res[0] && res[0].node;
        if (!canvas) { resolve(url); return; }
        const img = canvas.createImage();
        img.onload = () => {
          const MAX = 800;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: 0.85,
            success: r => resolve(r.tempFilePath),
            fail: () => resolve(url),
          });
        };
        img.onerror = () => resolve(url);
        img.src = url;
      });
    });
  },

  /* —— 保存 —— */
  onSave() {
    if (this.data.saving) return;
    const d = this.data;
    const name = (d.name || '').trim();
    if (!name) { ui.toast(this, '请输入商品名称'); return; }
    if (!this._rawImg) { ui.toast(this, '请上传商品图片'); return; }
    if (!d.price || !(Number(d.price) >= 0)) { ui.toast(this, '请输入正确的价格'); return; }
    const cat = this._cats[d.catIdx];
    if (!cat) { ui.toast(this, '请选择分类'); return; }
    const sub = (this._cats[d.catIdx].subs || [])[d.subIdx] || (this._cats[d.catIdx].subs || [''])[0] || '';

    const product = {
      name,
      brand: (d.brand || '').trim(),
      cat: cat.id,
      sub,
      price: Number(d.price),
      orig: d.orig !== '' && Number(d.orig) >= 0 ? Number(d.orig) : '',
      img: this._rawImg,
      tag: TAG_OPTIONS[d.tagIdx] ? TAG_OPTIONS[d.tagIdx].key : '',
      rating: Number(d.rating) || 5,
      sold: parseInt(d.sold, 10) || 0,
      desc: d.desc || '',
      specs: d.specs.filter(r => r.k.trim() && r.v.trim()).map(r => [r.k.trim(), r.v.trim()]),
    };

    this.setData({ saving: true });
    const req = this._id ? api.updateProduct(this._id, product) : api.createProduct(product);
    req.then(() => {
      api.clearCatalogCache();
      store.set('catalog', Date.now());
      ui.toast(this, this._id ? '已保存' : '已创建', 'check_circle-fill');
      setTimeout(() => wx.navigateBack(), 600);
    }).catch(e => {
      this.setData({ saving: false });
      ui.toast(this, e.message || '保存失败');
    });
  },
});
