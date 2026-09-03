/* ============================================================
   UI 辅助：页面内覆盖层组件（toast 等）统一从这里调用
   用法：ui.toast(this, '已加入收藏', 'favorite-fill')
   前提：页面 wxml 中挂有 <toast id="toast" />
   ============================================================ */
const store = require('./store');

function toast(page, msg, icon) {
  const t = page.selectComponent('#toast');
  if (t) t.show(msg, icon);
}

/* 登录后操作的前置校验（如收藏）：
   已登录返回 true；未登录弹原生引导 →「去登录」跳「我的」页并自动打开登录 sheet */
let loginIntent = false;
function loginGuard() {
  if (store.get('login')) return true;
  wx.showModal({
    title: '微信登录',
    content: '登录后才能收藏商品',
    confirmText: '去登录',
    cancelText: '暂不',
    success(r) {
      if (r.confirm) {
        loginIntent = true;
        wx.switchTab({ url: '/pages/me/me' });
      }
    },
  });
  return false;
}

/* me 页 onShow 消费「去登录」意图（一次性） */
function takeLoginIntent() {
  const v = loginIntent;
  loginIntent = false;
  return v;
}

/* tab 页弹抽屉时隐藏自定义 tabbar：tabbar 是框架渲染的独立层，
   页面内 fixed 元素 z-index 压不过它，不隐藏会遮挡抽屉底部 */
function toggleTabBar(page, hidden) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().setHidden(hidden);
  }
}

/* 相册选图（最多 count 张，回调给 tempFilePath 数组）：
   优先 wx.chooseMedia，旧基础库降级 wx.chooseImage；
   隐私接口管控：选图前若《用户隐私保护指引》未同意，先经 requirePrivacyAuthorize
   拉起官方授权弹窗（同意一次全局记住）；统一 fail 处理避免"点了没反应" */
function pickImages(count, cb) {
  const onFail = err => {
    const msg = (err && err.errMsg) || '选择图片失败';
    console.warn('[ui.pickImages]', msg);
    if (/privacy agreement/i.test(msg)) {
      /* 后台《用户隐私保护指引》未声明「选中的照片或视频信息」 */
      wx.showModal({
        title: '隐私接口未声明',
        content: '选图接口受《用户隐私保护指引》管控。请到小程序后台「设置 → 服务内容声明 → 用户隐私保护指引」声明「选中的照片或视频信息」，提交生效后重试。',
        showCancel: false,
      });
    } else if (/privacy permission|buttonId/i.test(msg)) {
      /* 指引已配置但用户未同意（曾拒绝会被缓存） */
      wx.showToast({ title: '需同意《用户隐私保护指引》后才能选图，请重试并在弹窗中点同意', icon: 'none', duration: 2500 });
    } else if (/auth deny|authorize/i.test(msg)) {
      wx.showToast({ title: '请在小程序设置中允许访问相册', icon: 'none' });
    } else {
      wx.showToast({ title: msg, icon: 'none' });
    }
  };
  const start = () => {
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: res => cb((res.tempFiles || []).map(f => f.tempFilePath)),
        fail: onFail,
      });
    } else {
      wx.chooseImage({
        count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => cb(res.tempFilePaths || []),
        fail: onFail,
      });
    }
  };
  /* 基础库 2.32.3+ 支持隐私授权探测；不支持时直接调（老版本不受隐私管控） */
  if (wx.getPrivacySetting && wx.requirePrivacyAuthorize) {
    wx.getPrivacySetting({
      success: s => {
        if (s && s.needAuthorization) {
          wx.requirePrivacyAuthorize({ success: start, fail: onFail });
        } else start();
      },
      fail: start,
    });
  } else start();
}

module.exports = { toast, loginGuard, takeLoginIntent, toggleTabBar, pickImages };
