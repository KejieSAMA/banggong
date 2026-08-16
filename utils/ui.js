/* ============================================================
   UI 辅助：页面内覆盖层组件（toast 等）统一从这里调用
   用法：ui.toast(this, '已加入收藏', 'favorite-fill')
   前提：页面 wxml 中挂有 <toast id="toast" />
   ============================================================ */
function toast(page, msg, icon) {
  const t = page.selectComponent('#toast');
  if (t) t.show(msg, icon);
}

module.exports = { toast };
