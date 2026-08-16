/* 自定义底部导航栏：M3 胶囊指示器 + 安全区适配
   tab 页 onShow 时调用 init(index) 同步激活项与主题 */
const theme = require('../utils/theme');

const TAB_LIST = [
  { id: 'home', label: '首页', icon: 'home', url: '/pages/home/home' },
  { id: 'mall', label: '商城', icon: 'storefront', url: '/pages/mall/mall' },
  { id: 'me', label: '我的', icon: 'person', url: '/pages/me/me' },
];

Component({
  options: { styleIsolation: 'apply-shared' },
  data: { selected: 0, theme: 'light', hidden: false, list: TAB_LIST },
  methods: {
    init(selected) {
      this.setData({ selected, theme: theme.current() });
    },
    /* tab 页弹出抽屉时隐藏 tabbar（框架的 tabbar 层级高于页面内元素，会遮挡抽屉底部） */
    setHidden(v) {
      if (this.data.hidden !== v) this.setData({ hidden: v });
    },
    onTap(e) {
      const index = e.currentTarget.dataset.index;
      if (index === this.data.selected) return;
      wx.switchTab({ url: TAB_LIST[index].url });
    },
  },
});
