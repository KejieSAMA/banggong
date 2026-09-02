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
   统一 fail 处理（toast + console.warn），避免"点了没反应"的静默失败 */
function pickImages(count, cb) {
  const onFail = err => {
    const msg = (err && err.errMsg) || '选择图片失败';
    console.warn('[ui.pickImages]', msg);
    if (/auth/.test(msg)) wx.showToast({ title: '请在设置中允许访问相册', icon: 'none' });
    else wx.showToast({ title: msg, icon: 'none' });
  };
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
}

module.exports = { toast, loginGuard, takeLoginIntent, toggleTabBar, pickImages };
