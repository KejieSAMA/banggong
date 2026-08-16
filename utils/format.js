/* 价格显示：整数省略小数，小数保留两位 */
function fmtPrice(n) {
  return Number.isInteger(n) ? n : n.toFixed(2);
}

/* 销量显示：过万缩写为 x.x万 */
function fmtSold(n) {
  return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n);
}

/* HTML 转义（rich-text 场景） */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = { fmtPrice, fmtSold, esc };
