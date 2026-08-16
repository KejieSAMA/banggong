/* ============================================================
   环境配置 —— 后端环境唯一入口（前后端分离）
   三种模式（按优先级）：
   1. BASE_URL 非空  → wx.request 直连（自建服务器/本地调试）
   2. CLOUD.env 非空 → wx.cloud.callContainer 云托管免鉴权调用（推荐，无需域名白名单）
   3. 均为空          → 完全使用内置 demo 数据（data/db.js）
   任何模式失败都会自动回落内置数据，保证演示完整。
   ============================================================ */
module.exports = {
  BASE_URL: '',          // 直连地址（如 https://xxx.com，不以 / 结尾）；空 = 不启用
  API_PREFIX: '/api',    // 接口前缀
  TIMEOUT: 10000,        // 请求超时（ms）

  /* 微信云托管环境（腾讯云）：微信开发者工具需「云开发/云托管」控制台对应环境 */
  CLOUD: {
    env: 'prod-d5grfvx41444fb0a7',
    service: 'koa-2s3m',
  },

  /* 图片公网域名：后端接口返回 /images/* 相对路径时拼接此前缀
     （<image> 无法走 callContainer，必须用公网域名） */
  IMAGES_BASE: 'https://koa-2s3m-297834-11-1469636321.sh.run.tcloudbase.com',
};
