/* 空态：icon + 文案 + 可选按钮（bind:action） */
Component({
  options: { styleIsolation: 'apply-shared' },
  properties: {
    icon: { type: String, value: 'search_off' },
    text: { type: String, value: '' },
    btnText: { type: String, value: '' },
  },
  methods: {
    onAction() { if (this.data.btnText) this.triggerEvent('action'); },
  },
});
