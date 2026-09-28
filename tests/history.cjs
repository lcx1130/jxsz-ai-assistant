const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, context = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, Response, TextDecoder, process, AbortSignal, URLSearchParams, ...context });
  return module.exports;
}
const dify = load('lib/dify.ts');
const calls = [];
let fixture;
const route = load('app/api/history/route.ts', {
  require: name => name.includes('session') ? { sessionUser: async () => 'cookie-user' } : name === 'next/server' ? { NextResponse: Response } : { ...dify, difyConfig: () => ({ base: 'https://test.invalid/v1', headers: {} }) },
  fetch: async url => { calls.push(url); return Response.json(fixture); },
});
const request = query => ({ nextUrl: new URL(`http://localhost/api/history?${query}`) });
test('uses server identity and forwards conversation-list pagination without exposing internal fields', async () => {
  fixture = { data: [{ id: 'c1', name: '宿舍', updated_at: 10, inputs: { private: 'hidden' } }], has_more: true };
  const result = await (await route.GET(request('user=u1&cursor=c0'))).json();
  assert.equal(result.data[0].name, '宿舍'); assert.equal(result.cursor, 'c1'); assert.equal(result.hasMore, true);
  assert.equal(result.data[0].inputs, undefined); assert.match(calls.at(-1), /user=cookie-user/); assert.match(calls.at(-1), /last_id=c0/);
});
test('restores chronological messages, source references and pagination cursor', async () => {
  fixture = { data: [{ id: 'new', query: '追问', answer: '第二条', created_at: 20 }, { id: 'old', query: '宿舍', answer: '第一条', created_at: 10, retriever_resources: [{ document_name: '知识库' }] }], has_more: true };
  const result = await (await route.GET(request('user=u1&conversationId=c1&cursor=m0'))).json();
  assert.equal(result.messages[0].content, '宿舍'); assert.equal(result.messages[1].sources[0].documentName, '知识库'); assert.equal(result.cursor, 'old');
  assert.match(calls.at(-1), /conversation_id=c1/); assert.match(calls.at(-1), /first_id=m0/);
});
test('restores paused staff workflow without leaking its form token', async () => {
  fixture = { data: [{ id: 'm1', query: '人工', answer: '', created_at: 10, status: 'paused', extra_contents: [{ type: 'human_input', submitted: false, workflow_run_id: 'r1', form_definition: { form_token: 'staff-secret', form_content: 'internal', inputs: [{ output_variable_name: 'human_reply' }], actions: [] } }] }] };
  const result = await (await route.GET(request('user=u1&conversationId=c1'))).json();
  const message = result.messages[1]; assert.equal(message.status, 'paused'); assert.equal(message.workflowRunId, 'r1'); assert.equal(message.humanForm.awaitingStaff, true); assert.equal(JSON.stringify(result).includes('staff-secret'), false);
});
