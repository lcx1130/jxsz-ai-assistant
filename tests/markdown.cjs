const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const moduleObject = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('components/ChatMarkdown.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports, require });
const ChatMarkdown = moduleObject.exports.default;
const render = content => renderToStaticMarkup(createElement(ChatMarkdown, { content }));
test('campus photos, clickable sources and resource tables render together', () => {
  const html = render('![第一食堂](/images/campus-images/canteen-01.png)\n\n[来源](https://cet.neea.edu.cn/)\n\n| 名称 | 链接 |\n| --- | --- |\n| 资料 | 学习 |');
  assert.match(html, /<img[^>]*src="\/images\/campus-images\/canteen-01.png"/);
  assert.match(html, /href="https:\/\/cet.neea.edu.cn\/"/);
  assert.match(html, /<table>/);
});
test('untrusted raw HTML and javascript links are not executable', () => {
  const html = render('<script>alert(1)</script>\n\n[x](javascript:alert)\n\n<img src=x onerror=alert(1)>');
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('onerror='), false);
  assert.equal(html.includes('href="javascript:'), false);
});
