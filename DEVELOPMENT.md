# 办公严选小程序 · 开发规范

> 本项目由 H5 原型（`../index.html`）高保真移植，视觉规范以原型为准。
> 原生 WXML/WXSS/JS 开发，无第三方 UI 库与运行时依赖。

## 1. 目录与职责

```
miniprogram/
├── app.json / app.js / app.wxss   # 路由、入口、全局令牌与通用样式
├── project.config.json            # appid 唯一出现位置（业务代码禁止引用 appid）
├── config/env.js                  # 后端 BASE_URL 唯一入口（前后端分离）
├── data/db.js                     # 内置演示数据（无后端兜底）
├── utils/                         # 纯逻辑层：api / store / theme / format / ui
├── components/                    # 通用组件（四件套齐全，json 声明 component:true）
├── custom-tab-bar/                # 自定义底部导航（微信约定目录名，不可改名）
├── images/                        # 本地图片（小写命名；>50KB 后续迁 CDN，由 api 层换 URL）
└── pages/<模块>/                   # 每页四件套：js / json / wxml / wxss
```

- 页面 js 只做「取数 → setData → 动作分发」；可复用逻辑一律下沉 `utils/`
- 禁止页面之间互相 `require`；页面间传参 URL query 只传 id
- `tools/` 为开发期脚本（如图标生成），已通过 `packOptions.ignore` 排除出包

## 2. 通用组件契约（props 单向流入 / events 向上抛出）

| 组件 | 属性 | 事件 | 约束 |
|---|---|---|---|
| `icon` | name / size(rpx) / color(可传 `var(--x)`) | — | SVG→mask 类（`masks.wxss`，脚本生成勿手改）；颜色随 `currentColor` 继承。注意：data URI 内单引号必须编码为 `%27`，否则 `url('')` 被截断、mask 失效渲染成色块 |
| `product-card` | product / fav / delay(ms) | `bind:fav` | 不直接改 store，收藏状态由父级传入并同步 |
| `empty-state` | icon / text / btnText | `bind:action` | 纯展示 |
| `sheet` | visible / title（slot 内容） | `bind:close` | 内部管理入场/退场动画与把手拖拽关闭 |
| `dialog` | visible / title / content / avatar / actions[] | `bind:close` `bind:action` | actions 支持 `{label, cls, icon, loading}` |
| `toast` | —（由 `ui.toast(page, msg, icon)` 调用） | — | 每页 wxml 挂 `<toast id="toast"/>` |

- 组件一律声明 `options: { styleIsolation: 'apply-shared' }` 以复用全局通用样式
- **slot 内容属于页面作用域**：sheet 插槽用的 `.sheet-row` 等样式必须放 `app.wxss`（已如此）
- 组件内禁止 `wx.request` / 直接读写 store / 页面导航；数据与状态变更只在页面层

## 3. 命名规范

- 目录 / 文件 / 组件：小写 kebab-case（`product-card`、`custom-tab-bar`）
- CSS 类名：与 H5 原型保持一致（`prod-card`、`chips-row`…）便于逐块对照；新增类同样 kebab-case
- JS：变量/函数 camelCase；常量 UPPER_SNAKE_CASE；私有成员 `_` 前缀
- 事件分发：WXML 统一 `data-act` / `data-id` + 页面单一 `handleAct`（延续原型 ACTIONS 动作表）

## 4. JS 代码规范

- ES6+（const/let、箭头函数、模板字符串、解构）；开启 ES6 转 ES5 + 增强编译
- `setData` 最小粒度更新（`this.setData({ 'list[3].fav': true })` 优先），避免整列表重推
- store 读写一律走 `store.get/set/具名方法`，禁止直接改内部对象；持久化字段白名单见 `store.js`
- 事件总线 `store.on/off` 必须成对注册，`onUnload` 解绑（tab 页常驻也保持同一写法）
- API 契约：统一 `{ code, data, msg }`，`code === 0` 成功；10s 超时；失败静默回落 `data/db.js` 并 `console.warn`
- wx.* 回调都带 `fail` 兜底（至少空函数），避免未捕获异常

## 5. WXML / WXSS 规范

- `wx:for` 必带 `wx:key`；绑定表达式不超过一层计算，复杂逻辑放 js 预计算
- **颜色 / 圆角 / 阴影 / 动效参数只允许引用 CSS 变量**（`var(--primary)` 等），禁止写死色值——保证明暗主题一致；已知例外：搜索高亮（rich-text 内联样式，按主题取字面值，集中在 `search.js` 顶部）
- 尺寸换算：原型 1px → 2rpx（390 设计稿），**全项目 wxss 不使用 px 单位**（例外：cat-box 描边 1rpx ≈ 0.5px hairline）；JS 中触摸坐标（如 sheet 拖拽）为物理 px，不属于样式
- **全局 `box-sizing: border-box`**（app.wxss 元素选择器实现，对应原型 `*{box-sizing}` 重置）：缺失时 `width:100%` 与 padding 叠加会导致 chip 叠压 / 列表溢出屏幕
- 动态值（animation-delay、拖拽位移）用 style 内联，其余进 class；禁止内联写颜色
- view 无 `:active`：统一 `hover-class`（`hv-sink` 按压缩放 / `hv-cell` 按压底色）
- 布局优先 flex；grid 仅用于等宽网格（chips 4 列、双列商品墙、宫格）

## 6. 主题与安全区

- 每页根节点 `class="page {{theme}}"`，`onShow` 时 `theme.syncNav()` 同步原生导航栏颜色并回填 `data.theme`
- 暗色切换走 `theme.toggle()`；各页通过 `store.on('theme')` 监听刷新
- 底部固定元素（custom-tab-bar、详情 dtl-bar、sheet/toast）统一 `padding-bottom: env(safe-area-inset-bottom)`
- custom-tab-bar 高度 `calc(100rpx + env(...))`（50px 官方标准）且必须 `box-sizing: border-box`——WXSS 默认 content-box 会把安全区算两次导致 bar 过高
- tab 页内容预留 tabbar 高度：根内容加 `.tab-pad`（与 tabbar 高度同步维护）

## 7. 导航约定

- tab 页（home/mall/me）：原生导航栏 + 自定义 tabBar；`onShow` 里 `this.getTabBar().init(index)`
- tab 页弹抽屉（登录/编辑/客服/排序/筛选）必须 `ui.toggleTabBar(page, true)` 隐藏 tabbar，关闭时恢复——框架的 tabbar 是独立层，页面内 fixed 元素 z-index 压不过，会遮挡抽屉底部
- 二级页：一律 `wx.navigateTo`（自带原生返回键与转场；非 tab 页不渲染 custom-tab-bar，即自动隐藏底部导航）
- 返回：`wx.navigateBack`；兜底 `fail` 时 `switchTab` 回首页（防止直达页无栈可退）

## 8. 数据、图片与云同步

- `config/env.js` 三模式：`BASE_URL` 非空直连；否则 `CLOUD.env` 非空走 `wx.cloud.callContainer`（云托管免鉴权，自动携带 openid）；均失败回落本地数据
- 接口：`GET /api/banners | /api/categories | /api/products | /api/products/:id | /api/hot-keywords`（后端仓库：banggong-koa）
- 本地图片路径 `/images/xx.jpg` 由 api 层拼装；后端应返回完整 URL —— 页面不感知来源
- **云同步（store.cloudPull）**：启动时拉取云端收藏/足迹/搜索历史/资料，与本地并集合并（离线新增不丢）后**仅回推本地新增项**；开启后本地变更即时 fire-and-forget 推送
- 云端不可用（`code:1`/网络失败）自动保持本地模式，UI 行为不变；页面永远只读 store，不感知云端状态
- **登录闭环**：身份标识由云托管网关注入的 `x-wx-openid` 承担（getUserProfile 已废弃，不取微信昵称头像）
  - 登录 = 一键确认（`store.login()` → `POST /api/user/login`）：身份即 openid，无需填写资料；昵称默认「用户XXXXXX」**由服务端按 openid 哈希确定性生成**——同一微信号退出重登、换设备都恒定不变；登录成功立即执行一次 cloudPull 拉回云端数据（登出期间的本地足迹合并上推），无需重启小程序；云端不可用时本地随机兜底
  - 头像昵称在登录后经「编辑资料」可选完善（`open-type="chooseAvatar"` + `type="nickname"`，微信合规组件）
  - 未登录：「我的」页显示「点击登录」；收藏操作经 `ui.loginGuard()` 弹原生引导 →「去登录」跳「我的」页自动打开登录 sheet；浏览/搜索对所有人开放（足迹本地记录，不推云）
  - 退出登录：本机清空收藏/足迹/搜索历史（防共用设备泄露；设备偏好主题/排序/筛选保留），云端仅置 `loggedOut` 标记、账户数据保留——重新登录自动拉回；数据类云推送均要求登录态；cloudPull 见 `loggedOut` 不恢复登录态
  - 清除本地缓存 ≠ 退出登录：登录态存于服务端（openid 档案），清缓存/换设备后启动自动恢复；退出请走 设置 → 退出登录（标记推送失败自动重试一次）
  - 足迹支持单条删除（编辑模式）与一键清空，均多端同步（`DELETE /api/history/:id`）
  - 头像统一经页面离屏 canvas 压缩为 128px JPEG data URL（约 <30KB）再上传，避免原图 base64 超限与同步大 payload
- 后端安全：用户接口仅信任携带 `x-wx-source` 网关头的请求（公网直访可伪造 `x-wx-openid`，缺 `x-wx-source` 一律 code:1）；收藏多端并发为 last-write-wins（展示型应用可接受）

## 8.5 商品管理（管理员隐藏入口）

- 管理员识别：后端环境变量 `ADMIN_OPENIDS`（openid 白名单）；`GET /api/user/profile` 返回 `admin` 标记，cloudPull 存入 `store`（不持久化），「我的」页仅管理员显示「商品管理」cell
- openid 获取：设置页「我的ID」行点按复制（登录后显示）
- 管理页：`pages/admin/products`（列表/搜索/上下架/删除 + 分类/内容管理入口）+ `pages/admin/product-edit`（新建/编辑表单）+ `pages/admin/categories`（分类增删改/二级分类；分类下有商品时删除被后端拒绝）+ `pages/admin/content`（首页轮播 Banner / 热搜词，全量替换保存）
- 商品图集：编辑页宫格管理器（≤9 张固定正方形格子，首张为主图徽标，逐张压缩后 OSS 直传）；保存提交 `images` 数组，服务端自动同步 `img = images[0]`；详情页轮播使用真实图集 `p.images`（不借用其他商品图）
- 合规：用户协议/隐私政策为独立页面 `pages/agreement?type=user|privacy`（登录抽屉与设置页均跳转；【】占位符正式发布前替换为真实主体与联系方式）
- 商品图片：相册选图 → 页面离屏 canvas 压缩（最长边 800px JPEG）→ `api.uploadImage()`：先取服务端签名凭证（`GET /api/admin/upload-token`）再 `wx.uploadFile` 直传阿里云 OSS，商品 `img` 存完整 URL；`AK/SK` 只在后端环境变量，绝不出现在小程序代码
- 目录刷新：管理端任何变更后 `api.clearCatalogCache()` + `store.set('catalog', Date.now())` 广播；home/mall/category/search/favorites/history/product 七页订阅 `catalog` 事件重拉
- 上下架：商品 `online` 字段（默认 true），公开目录接口自动过滤下架商品

## 9. 工程杂项

- 提交信息约定式：`feat:` / `fix:` / `style:` / `refactor:` / `chore:`
- `.gitignore` 排除 `node_modules/`、日志与私钥文件
- 改图标：编辑原型 SVG 雪碧图后重跑 `node tools/gen-icons.js <原型index.html路径>`（工作区默认布局可省略路径）
- 原型对照：视觉问题先查 `../index.html` 对应区块（各 wxss 注释均标注了原型章节号）

## 10. 已知与原型的差异（有意为之）

| 差异 | 原因 |
|---|---|
| 首页无页内 logo 标题行 | 原生导航栏已展示「办公严选」，避免重复 |
| tabBar 仅激活项显示胶囊指示器 | 原型三个 tab 胶囊常亮无激活反馈（原型瑕疵），按 M3 规范修正 |
| 顶栏/状态栏/胶囊为微信原生 | 平台组件，不自绘 |
| 分享「微信好友」走真实转发 | 原生能力顺手接入；其余分享项保持演示 toast |
