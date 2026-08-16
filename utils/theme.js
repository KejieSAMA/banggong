/* ============================================================
   主题：页面根节点 class（light/dark）+ 原生导航栏颜色同步
   页面 onShow 时调用 syncNav()；切换用 toggle()/apply()
   ============================================================ */
const store = require('./store');

const NAV = {
  light: { frontColor: '#000000', backgroundColor: '#FBF8FF' },
  dark: { frontColor: '#ffffff', backgroundColor: '#121318' },
};

function syncNav() {
  const conf = NAV[store.get('theme')] || NAV.light;
  wx.setNavigationBarColor(Object.assign({ fail() {} }, conf));
  if (wx.setBackgroundColor) wx.setBackgroundColor({ backgroundColor: conf.backgroundColor, fail() {} });
}

function apply(theme) {
  store.set('theme', theme === 'dark' ? 'dark' : 'light');
  syncNav();
}

function toggle() {
  apply(store.get('theme') === 'dark' ? 'light' : 'dark');
}

function current() {
  return store.get('theme') === 'dark' ? 'dark' : 'light';
}

module.exports = { apply, toggle, syncNav, current };
