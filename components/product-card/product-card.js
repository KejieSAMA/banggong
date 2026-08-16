/* 商品网格卡：product 由父级传入（img 已解析为可显示路径），fav 状态由父级同步 */
const { fmtPrice, fmtSold } = require('../../utils/format');

Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    product: { type: Object, value: {} },
    fav: { type: Boolean, value: false },
    delay: { type: null, value: 0 },   // stagger 入场延迟 ms，父级预计算
  },
  data: { imgError: false, priceText: '', soldText: '' },
  observers: {
    product(p) {
      if (!p || !p.id) return;
      this.setData({
        imgError: false,
        priceText: fmtPrice(p.price),
        soldText: '已售' + fmtSold(p.sold),
      });
    },
  },
  methods: {
    onImgError() { this.setData({ imgError: true }); },
    onFav(e) {
      this.triggerEvent('fav', { id: this.data.product.id });
    },
  },
});
