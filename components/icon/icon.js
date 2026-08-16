/* 图标组件：mask 类由 masks.wxss 提供（tools/gen-icons.js 生成），
   颜色取 currentColor（随上下文继承）或显式 color（支持 var()） */
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    name: { type: String, value: '' },
    size: { type: null, value: 48 },      // rpx，对应 demo ic 系列（48=24px）
    color: { type: String, value: '' },   // 可选，如 var(--primary)；缺省继承上下文文字色
  },
  data: { cls: 'broken_image' },
  observers: {
    name(n) {
      this.setData({ cls: n || 'broken_image' });
    },
  },
});
