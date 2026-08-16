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
    loginVisible: false,
    agree: false,
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
    if (ui.takeLoginIntent()) this.openLogin();
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
    if (act === 'open-profile') {
      /* 未登录 → 一键登录；已登录 → 编辑资料 */
      if (store.get('login')) this.openProfile();
      else this.openLogin();
    } else if (act === 'nav-favorites') wx.navigateTo({ url: '/pages/favorites/favorites' });
    else if (act === 'nav-history') wx.navigateTo({ url: '/pages/history/history' });
    else if (act === 'open-service') { ui.toggleTabBar(this, true); this.setData({ serviceVisible: true }); }
    else if (act === 'toast-feedback') ui.toast(this, '感谢你的反馈！');
    else if (act === 'open-settings') wx.navigateTo({ url: '/pages/settings/settings' });
  },

  /* —— 一键微信登录（身份即 openid，默认昵称「用户XXXXXX」） —— */
  openLogin() {
    ui.toggleTabBar(this, true);
    this.setData({ loginVisible: true });
  },
  onLoginClose() {
    ui.toggleTabBar(this, false);
    this.setData({ loginVisible: false });
  },
  onLoginConfirm() {
    if (!this.data.agree) {
      ui.toast(this, '请先勾选同意用户协议与隐私政策');
      return;
    }
    store.login();
    ui.toggleTabBar(this, false);
    this.setData({ loginVisible: false });
    ui.toast(this, '登录成功，欢迎回来', 'check_circle-fill');
  },

  /* 隐私勾选：整行点击切换；协议链接点击看文档（catchtap 阻止冒泡切换） */
  onPrivacyToggle() { this.setData({ agree: !this.data.agree }); },
  onPrivacyDoc() { ui.toast(this, '文档仅作界面演示'); },

  /* —— 编辑资料（登录后可选完善头像昵称；chooseAvatar + nickname，微信合规组件） —— */
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
    store.setProfile(name, this.data.draftAvatar);
    ui.toggleTabBar(this, false);
    this.setData({ profileVisible: false });
    ui.toast(this, '资料已保存', 'check_circle-fill');
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
