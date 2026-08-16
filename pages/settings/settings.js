const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');

Page({
  data: {
    theme: 'light',
    isLogin: false,
    notifyOn: true,
    cacheCleared: false,
    clearVisible: false,
    clearActions: [{ label: '取消' }, { label: '清理', cls: 'primary' }],
    logoutVisible: false,
    logoutActions: [{ label: '取消' }, { label: '退出', cls: 'primary' }],
    aboutVisible: false,
  },

  onLoad() {
    this._onTheme = () => this.setData({ theme: theme.current() });
    this._onLogin = () => this.setData({ isLogin: !!store.get('login') });
    store.on('theme', this._onTheme);
    store.on('login', this._onLogin);
  },
  onShow() {
    theme.syncNav();
    this.setData({ theme: theme.current(), isLogin: !!store.get('login') });
  },
  onUnload() {
    store.off('theme', this._onTheme);
    store.off('login', this._onLogin);
  },

  handleAct(e) {
    const act = e.currentTarget.dataset.act;
    if (act === 'toast-todo') ui.toast(this, '功能开发中，敬请期待');
    else if (act === 'toast-lang') ui.toast(this, '当前原型仅支持简体中文');
    else if (act === 'clear-cache') this.setData({ clearVisible: true });
    else if (act === 'about') this.setData({ aboutVisible: true });
    else if (act === 'toast-doc') ui.toast(this, '文档仅作界面演示');
    else if (act === 'logout') this.setData({ logoutVisible: true });
  },

  onNotify() {
    const on = !this.data.notifyOn;
    this.setData({ notifyOn: on });
    ui.toast(this, on ? '已开启消息通知' : '已关闭消息通知');
  },
  onToggleTheme() {
    theme.toggle();
    this.setData({ theme: theme.current() });
  },

  /* 清除缓存（带 loading 演示） */
  onClearClose() { this.setData({ clearVisible: false }); },
  onClearAction(e) {
    if (e.detail.index !== 1) { this.setData({ clearVisible: false }); return; }
    this.setData({ clearActions: [{ label: '取消' }, { label: '清理中', cls: 'primary', loading: true }] });
    setTimeout(() => {
      this.setData({
        clearVisible: false,
        cacheCleared: true,
        clearActions: [{ label: '取消' }, { label: '清理', cls: 'primary' }],
      });
      ui.toast(this, '已清理 12.6 MB 缓存', 'check_circle-fill');
    }, 700);
  },

  /* 退出登录 */
  onLogoutClose() { this.setData({ logoutVisible: false }); },
  onLogoutAction(e) {
    this.setData({ logoutVisible: false });
    if (e.detail.index === 1) {
      store.logout();
      ui.toast(this, '已退出登录');
    }
  },

  /* 关于 */
  onAboutClose() { this.setData({ aboutVisible: false }); },
  onAboutUpdate() { ui.toast(this, '当前已是最新版本 v1.0.0'); },
});
