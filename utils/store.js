/* ============================================================
   全局状态：持久化（wx.setStorageSync）+ 事件总线
   约定：读写一律通过 get/set/具名方法；事件 on/off 成对注册
   ============================================================ */
const KEY = 'bg_state_v1';
const PERSIST_KEYS = ['login', 'favorites', 'history', 'searchHistory', 'theme', 'sort', 'freeShipOnly'];

const handlers = {};

function load() {
  try {
    const s = wx.getStorageSync(KEY);
    if (s && typeof s === 'object') return s;
  } catch (e) { /* 存储异常按默认处理 */ }
  return {};
}

const state = Object.assign({
  login: null,
  favorites: [],
  history: [],
  searchHistory: [],
  theme: 'light',
  sort: 'default',
  freeShipOnly: false,
}, load());

function persist() {
  try {
    const out = {};
    PERSIST_KEYS.forEach(k => { out[k] = state[k]; });
    wx.setStorageSync(KEY, out);
  } catch (e) { /* 忽略持久化失败 */ }
}

function emit(name) {
  (handlers[name] || []).slice().forEach(fn => { try { fn(); } catch (e) { console.error('[bus]', name, e); } });
}

module.exports = {
  get(k) { return state[k]; },
  set(k, v) { state[k] = v; persist(); emit(k); },

  on(name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); },
  off(name, fn) {
    const a = handlers[name];
    if (a) { const i = a.indexOf(fn); if (i > -1) a.splice(i, 1); }
  },

  /* 收藏 */
  isFav(id) { return state.favorites.indexOf(id) > -1; },
  toggleFav(id) {
    const i = state.favorites.indexOf(id);
    if (i < 0) state.favorites.unshift(id); else state.favorites.splice(i, 1);
    persist(); emit('fav');
    return i < 0; // 返回是否为「加入收藏」
  },
  removeFav(id) {
    state.favorites = state.favorites.filter(x => x !== id);
    persist(); emit('fav');
  },

  /* 浏览足迹（最多 20 条） */
  addHistory(id) {
    state.history = [id].concat(state.history.filter(x => x !== id)).slice(0, 20);
    persist(); emit('history');
  },
  clearHistory() { state.history = []; persist(); emit('history'); },

  /* 搜索历史（最多 8 条） */
  addSearch(k) {
    state.searchHistory = [k].concat(state.searchHistory.filter(x => x !== k)).slice(0, 8);
    persist(); emit('search');
  },
  clearSearch() { state.searchHistory = []; persist(); emit('search'); },

  /* 登录（演示：模拟微信授权） */
  login() {
    state.login = { name: '微信用户_' + Math.random().toString(36).slice(2, 6) };
    persist(); emit('login');
  },
  logout() { state.login = null; persist(); emit('login'); },
};
