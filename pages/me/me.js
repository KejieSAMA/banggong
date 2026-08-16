const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');

Page({
  data: {
    theme: 'light',
    loginName: '',
    favCount: 0,
    hisCount: 0,
    loginVisible: false,
    loginActions: [
      { label: '拒绝' },
      { label: '允许', cls: 'wxf' },
    ],
    serviceVisible: false,
  },

  onLoad() {
    this._refresh = () => this.refresh();
    store.on('fav', this._refresh);
    store.on('history', this._refresh);
    store.on('login', this._refresh);
    this._onTheme = () => this.setData({ theme: theme.current() });
    store.on('theme', this._onTheme);
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().init(2);
    theme.syncNav();
    this.setData({ theme: theme.current() });
    this.refresh();
  },
  onUnload() {
    store.off('fav', this._refresh);
    store.off('history', this._refresh);
    store.off('login', this._refresh);
    store.off('theme', this._onTheme);
  },

  refresh() {
    const login = store.get('login');
    this.setData({
      loginName: login ? login.name : '',
      favCount: store.get('favorites').length,
      hisCount: store.get('history').length,
    });
  },

  handleAct(e) {
    const act = e.currentTarget.dataset.act;
    if (act === 'open-login') this.setData({ loginVisible: true });
    else if (act === 'nav-favorites') wx.navigateTo({ url: '/pages/favorites/favorites' });
    else if (act === 'nav-history') wx.navigateTo({ url: '/pages/history/history' });
    else if (act === 'toast-coupon') ui.toast(this, '优惠券功能仅作展示');
    else if (act === 'toast-todo') ui.toast(this, '功能开发中，敬请期待');
    else if (act === 'open-service') this.setData({ serviceVisible: true });
    else if (act === 'toast-feedback') ui.toast(this, '感谢你的反馈！');
    else if (act === 'open-settings') wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /* 登录对话框 */
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginAction(e) {
    const { index } = e.detail;
    this.setData({ loginVisible: false });
    if (index === 1) {
      store.login();
      ui.toast(this, '登录成功，欢迎回来', 'check_circle-fill');
    } else {
      ui.toast(this, '已取消登录');
    }
  },

  /* 客服 sheet */
  onServiceClose() { this.setData({ serviceVisible: false }); },
  onService(e) {
    const type = e.currentTarget.dataset.svc;
    this.setData({ serviceVisible: false });
    if (type === '电话') ui.toast(this, '客服热线：400-800-1234');
    else ui.toast(this, '原型演示：在线客服未接入');
  },
});
