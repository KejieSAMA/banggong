/* 从原型 index.html 的 SVG 雪碧图提取 symbol → components/icon/masks.wxss
   用法：node tools/gen-icons.js <原型index.html路径>
   路径缺省时尝试 ../../index.html（工作区布局：bangong/miniprogram/tools） */
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join(__dirname, '..', '..', 'index.html');
if (!fs.existsSync(src)) {
  console.error('找不到原型文件：' + src + '\n用法：node tools/gen-icons.js <原型index.html路径>');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const re = /<symbol id="i-([\w-]+)" viewBox="[^"]*"><path d="([^"]+)"\/><\/symbol>/g;
const out = [];
let m;
while ((m = re.exec(html)) !== null) {
  const name = m[1];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 -960 960 960'><path d='${m[2]}'/></svg>`;
  /* encodeURIComponent 不转义单引号，必须补编码为 %27，
     否则 url('...') 会被 SVG 内部的 ' 提前截断，mask 声明整体失效（渲染成色块） */
  const enc = encodeURIComponent(svg).replace(/'/g, '%27');
  out.push(`.im-${name}{-webkit-mask-image:url('data:image/svg+xml,${enc}');mask-image:url('data:image/svg+xml,${enc}')}`);
}

const target = path.join(__dirname, '..', 'components', 'icon', 'masks.wxss');
const banner = '/* 由 tools/gen-icons.js 从原型 index.html 自动生成，请勿手改 */\n';
fs.writeFileSync(target, banner + out.join('\n') + '\n');
console.log('icons:', out.length, '→', target);
