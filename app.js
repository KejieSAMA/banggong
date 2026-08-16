const store = require('./utils/store');
const theme = require('./utils/theme');
const env = require('./config/env');

App({
  onLaunch() {
    /* 云托管环境初始化（callContainer 依赖；失败不影响本地兜底运行） */
    if (env.CLOUD && env.CLOUD.env && typeof wx !== 'undefined' && wx.cloud && wx.cloud.init) {
      try {
        wx.cloud.init({ env: env.CLOUD.env, traceUser: true });
      } catch (e) {
        console.warn('[cloud] init 失败，接口将回落本地数据:', e.message);
      }
    }
    // 启动即按持久化主题同步原生导航栏颜色
    theme.syncNav();
    // 云同步：拉取云端收藏/足迹/搜索历史/资料（不可用则保持本地模式）
    store.cloudPull();
  },
});
