/* 轻提示：ui.toast(page, msg, icon) 调用，页面需挂 <toast id="toast"/> */
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {},
  data: { rendered: false, out: false, message: '', icon: '' },
  methods: {
    show(msg, icon) {
      if (this._t1) clearTimeout(this._t1);
      if (this._t2) clearTimeout(this._t2);
      this.setData({ rendered: true, out: false, message: msg || '', icon: icon || '' });
      this._t1 = setTimeout(() => {
        this.setData({ out: true });
        this._t2 = setTimeout(() => this.setData({ rendered: false }), 220);
      }, 1900);
    },
  },
  lifetimes: {
    detached() {
      if (this._t1) clearTimeout(this._t1);
      if (this._t2) clearTimeout(this._t2);
    },
  },
});
