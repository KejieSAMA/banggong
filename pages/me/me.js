const store = require('../../utils/store');
const theme = require('../../utils/theme');
const ui = require('../../utils/ui');

Page({
  data: {
    theme: 'light',
    loginName: '',
    avatar: '',
    favCount: 0,
    hisCount: 0,
    profileVisible: false,
    draftName: '',
    draftAvatar: '',
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
      avatar: login && login.avatar ? login.avatar : '',
      favCount: store.get('favorites').length,
      hisCount: store.get('history').length,
    });
  },

  handleAct(e) {
    const act = e.currentTarget.dataset.act;
    if (act === 'open-profile') this.openProfile();
    else if (act === 'nav-favorites') wx.navigateTo({ url: '/pages/favorites/favorites' });
    else if (act === 'nav-history') wx.navigateTo({ url: '/pages/history/history' });
    else if (act === 'toast-coupon') ui.toast(this, '优惠券功能仅作展示');
    else if (act === 'toast-todo') ui.toast(this, '功能开发中，敬请期待');
    else if (act === 'open-service') this.setData({ serviceVisible: true });
    else if (act === 'toast-feedback') ui.toast(this, '感谢你的反馈！');
    else if (act === 'open-settings') wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /* —— 资料编辑（头像 chooseAvatar + 昵称 nickname 输入框，微信合规组件） —— */
  openProfile() {
    this.setData({
      profileVisible: true,
      draftName: this.data.loginName,
      draftAvatar: this.data.avatar,
    });
  },
  onProfileClose() { this.setData({ profileVisible: false }); },
  onNameInput(e) { this.setData({ draftName: e.detail.value }); },

  onChooseAvatar(e) {
    const url = e.detail.avatarUrl;
    if (!url) return;
    /* 转存 base64 data URL（云端档案用）；失败则仅本机展示 */
    const ext = (url.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'png' : (ext === 'webp' ? 'webp' : 'jpeg');
    wx.getFileSystemManager().readFile({
      filePath: url,
      encoding: 'base64',
      success: res => {
        const dataUrl = 'data:image/' + mime + ';base64,' + res.data;
        if (dataUrl.length > 512 * 1024) {
          ui.toast(this, '头像图片过大，请换一张');
          return;
        }
        this.setData({ draftAvatar: dataUrl });
      },
      fail: () => this.setData({ draftAvatar: url }),
    });
  },

  onSaveProfile() {
    const name = (this.data.draftName || '').trim();
    if (!name) {
      ui.toast(this, '请输入昵称');
      return;
    }
    store.setProfile(name, this.data.draftAvatar);
    this.setData({ profileVisible: false });
    ui.toast(this, '资料已保存', 'check_circle-fill');
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
