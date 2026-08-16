/* ============================================================
   全局状态：本地持久化（wx.setStorageSync）+ 事件总线 + 云同步
   同步策略：
   - cloudPull()：启动时拉取云端 favorites/history/searchHistory/profile，
     与本地做「并集合并（本地新增保留）」后回推云端，开启云同步
   - 云同步开启后，本地变更即时生效并 fire-and-forget 推送云端
   - 云端不可用（code:1/网络失败）→ 保持本地模式，行为与纯离线一致
   约定：读写一律通过 get/set/具名方法；事件 on/off 成对注册
   ============================================================ */
const api = require('./api');

const KEY = 'bg_state_v1';
const PERSIST_KEYS = ['login', 'favorites', 'history', 'searchHistory', 'theme', 'sort', 'freeShipOnly'];

const handlers = {};
let cloud = false; // 云同步是否已开启

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

/* 云端推送（失败仅告警，不回滚本地） */
function push(promiseFactory, tag) {
  if (!cloud) return;
  Promise.resolve().then(promiseFactory).catch(e => console.warn('[store] 云推送失败(' + tag + '):', e.message));
}
const pushFavorites = () => push(() => api.saveFavorites(state.favorites), 'favorites');

/* —— 云同步：拉取 + 并集合并（本地离线新增保留）+ 回推 —— */
function cloudPull() {
  return Promise.all([
    api.getProfile(), api.getFavorites(), api.getHistory(), api.getSearchHistory(),
  ]).then(res => {
    const [profile, cloudFav, cloudHis, cloudKwd] = res;
    state.favorites = [...new Set(state.favorites.concat(cloudFav || []))].slice(0, 200);
    state.history = [...new Set(state.history.concat(cloudHis || []))].slice(0, 20);
    state.searchHistory = [...new Set(state.searchHistory.concat(cloudKwd || []))].slice(0, 8);
    if (profile && profile.nickname && profile.nickname !== '微信用户') {
      state.login = { name: profile.nickname, avatar: profile.avatar || '' };
    }
    persist();
    cloud = true;
    ['login', 'fav', 'history', 'search'].forEach(emit);
    /* 合并结果回推云端（仅本地新增项，避免每次启动全量回推），保证多端一致 */
    const onlyLocal = (merged, cloudList) => merged.filter(x => (cloudList || []).indexOf(x) < 0);
    if (onlyLocal(state.favorites, cloudFav).length) {
      push(() => api.saveFavorites(state.favorites), 'favorites-merge');
    }
    onlyLocal(state.history, cloudHis).forEach(id => push(() => api.pushHistory(id), 'history-merge'));
    onlyLocal(state.searchHistory, cloudKwd).forEach(q => push(() => api.pushSearch(q), 'search-merge'));
    console.log('[store] 云同步已开启');
    return true;
  }).catch(e => {
    cloud = false;
    console.warn('[store] 云同步不可用，保持本地模式:', e.message);
    return false;
  });
}

module.exports = {
  cloudPull,
  isCloud: () => cloud,

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
    pushFavorites();
    return i < 0; // 返回是否为「加入收藏」
  },
  removeFav(id) {
    state.favorites = state.favorites.filter(x => x !== id);
    persist(); emit('fav');
    pushFavorites();
  },

  /* 浏览足迹（最多 20 条） */
  addHistory(id) {
    if (state.history[0] === id) return; // 连续浏览不重复推
    state.history = [id].concat(state.history.filter(x => x !== id)).slice(0, 20);
    persist(); emit('history');
    push(() => api.pushHistory(id), 'history');
  },
  clearHistory() {
    state.history = [];
    persist(); emit('history');
    push(() => api.clearHistory(), 'history-clear');
  },

  /* 搜索历史（最多 8 条） */
  addSearch(k) {
    state.searchHistory = [k].concat(state.searchHistory.filter(x => x !== k)).slice(0, 8);
    persist(); emit('search');
    push(() => api.pushSearch(k), 'search');
  },
  clearSearch() {
    state.searchHistory = [];
    persist(); emit('search');
    push(() => api.clearSearch(), 'search-clear');
  },

  /* 资料：真实昵称/头像（云端按 openid 关联） */
  setProfile(name, avatar) {
    state.login = { name: name || '微信用户', avatar: avatar || '' };
    persist(); emit('login');
    push(() => api.saveProfile({ nickname: name, avatar }), 'profile');
  },
  /* 退出登录：同步重置云端档案，否则下次 cloudPull 会按云端昵称恢复登录态 */
  logout() {
    push(() => api.saveProfile({ nickname: '微信用户', avatar: '' }), 'profile-reset');
    state.login = null;
    persist(); emit('login');
  },
};
