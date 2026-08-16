/* 居中对话框：父级控制 visible，按钮由 actions 配置数组驱动 */
Component({
  options: { styleIsolation: 'apply-shared', multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
    avatar: { type: String, value: '' },          // 顶部圆形图标（如登录弹窗 person）
    content: { type: String, value: '' },
    actions: { type: Array, value: [] },          // [{label, cls, icon, loading}]
  },
  data: { rendered: false, out: false },
  observers: {
    visible(v) {
      if (v) {
        this.setData({ rendered: true, out: false });
      } else if (this.data.rendered) {
        this.setData({ out: true });
        if (this._t) clearTimeout(this._t);
        this._t = setTimeout(() => this.setData({ rendered: false, out: false }), 200);
      }
    },
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close'); },
    onAction(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.actions[index];
      if (item && item.loading) return; // 加载中的按钮不可点
      this.triggerEvent('action', { index });
    },
  },
  lifetimes: {
    detached() { if (this._t) clearTimeout(this._t); },
  },
});
