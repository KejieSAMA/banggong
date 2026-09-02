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
    /* 隐私接口授权：chooseMedia/chooseImage 等受《用户隐私保护指引》管控，
       注册自定义授权弹窗（后台已声明对应权限且用户未同意过时触发；同意后继续挂起的调用） */
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization(resolve => {
        wx.showModal({
          title: '隐私保护提示',
          content: '选择照片前请阅读并同意《用户隐私保护指引》。我们仅在你主动选图时读取所选照片，不会访问相册其他内容。',
          confirmText: '同意',
          cancelText: '拒绝',
          success: r => resolve({ event: r.confirm ? 'agree' : 'disagree' }),
          fail: () => resolve({ event: 'disagree' }),
        });
      });
    }
    // 云同步：拉取云端收藏/足迹/搜索历史/资料（不可用则保持本地模式）
    store.cloudPull();
  },
});
