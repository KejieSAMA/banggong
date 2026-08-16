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
    /* 从收藏守卫「去登录」跳转过来时，直接打开登录 sheet */
    if (ui.takeLoginIntent()) this.openProfile();
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
    else if (act === 'open-service') { ui.toggleTabBar(this, true); this.setData({ serviceVisible: true }); }
    else if (act === 'toast-feedback') ui.toast(this, '感谢你的反馈！');
    else if (act === 'open-settings') wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /* —— 微信登录 / 资料编辑（头像 chooseAvatar + 昵称 nickname 输入框，微信合规组件） —— */
  openProfile() {
    ui.toggleTabBar(this, true);
    this.setData({
      profileVisible: true,
      draftName: this.data.loginName,
      draftAvatar: this.data.avatar,
    });
  },
  onProfileClose() {
    ui.toggleTabBar(this, false);
    this.setData({ profileVisible: false });
  },
  onNameInput(e) { this.setData({ draftName: e.detail.value }); },

  onChooseAvatar(e) {
    const url = e.detail.avatarUrl;
    if (!url) return;
    /* 压缩为 128px JPEG data URL（云端档案用）；失败则仅本机展示 */
    this.compressAvatar(url, dataUrl => {
      this.setData({ draftAvatar: dataUrl || url });
    });
  },

  compressAvatar(url, done) {
    wx.createSelectorQuery().in(this).select('#avatarCanvas').fields({ node: true }).exec(res => {
      const canvas = res && res[0] && res[0].node;
      if (!canvas) { done(null); return; }
      const SIZE = 128;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      const img = canvas.createImage();
      img.onload = () => {
        /* 居中 cover 裁剪为正方形 */
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'jpg',
          quality: 0.8,
          success: r => {
            wx.getFileSystemManager().readFile({
              filePath: r.tempFilePath,
              encoding: 'base64',
              success: rd => done('data:image/jpeg;base64,' + rd.data),
              fail: () => done(null),
            });
          },
          fail: () => done(null),
        });
      };
      img.onerror = () => done(null);
      img.src = url;
    });
  },

  onSaveProfile() {
    const name = (this.data.draftName || '').trim();
    if (!name) {
      ui.toast(this, '请输入昵称');
      return;
    }
    const wasLogin = !!this.data.loginName;
    store.setProfile(name, this.data.draftAvatar);
    ui.toggleTabBar(this, false);
    this.setData({ profileVisible: false });
    ui.toast(this, wasLogin ? '资料已保存' : '登录成功，欢迎回来', 'check_circle-fill');
  },

  /* 客服 sheet */
  onServiceClose() {
    ui.toggleTabBar(this, false);
    this.setData({ serviceVisible: false });
  },
  onService(e) {
    const type = e.currentTarget.dataset.svc;
    ui.toggleTabBar(this, false);
    this.setData({ serviceVisible: false });
    if (type === '电话') ui.toast(this, '客服热线：400-800-1234');
    else ui.toast(this, '原型演示：在线客服未接入');
  },
});
