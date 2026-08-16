/* 底部弹层：父级控制 visible，内容走 slot；把手支持拖拽下滑关闭 */
Component({
  options: { styleIsolation: 'apply-shared', multipleSlots: false },
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
  },
  data: { rendered: false, out: false, dy: 0 },
  observers: {
    visible(v) {
      if (v) {
        this.setData({ rendered: true, out: false, dy: 0 });
      } else if (this.data.rendered) {
        this.setData({ out: true });
        if (this._t) clearTimeout(this._t);
        this._t = setTimeout(() => this.setData({ rendered: false, out: false }), 210);
      }
    },
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close'); },

    /* 把手拖拽：跟随手指下滑，松手超过 100px 关闭 */
    onHandleStart(e) {
      this._y0 = e.touches[0].clientY;
      this._dragging = true;
    },
    onHandleMove(e) {
      if (!this._dragging) return;
      const dy = Math.max(0, e.touches[0].clientY - this._y0);
      this.setData({ dy });
    },
    onHandleEnd() {
      if (!this._dragging) return;
      this._dragging = false;
      if (this.data.dy > 100) {
        this.setData({ dy: 0 });
        this.onClose();
      } else {
        this.setData({ dy: 0 });
      }
    },
  },
  lifetimes: {
    detached() { if (this._t) clearTimeout(this._t); },
  },
});
