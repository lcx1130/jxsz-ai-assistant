const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, context = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, Response, TextDecoder, process, AbortSignal, encodeURIComponent, ...context });
  return module.exports;
}
const { readDifyStream, publicHumanForm } = load('lib/dify.ts');
function stream(events) {
  const bytes = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  let pos = 0;
  return new Response(new ReadableStream({ pull(c) { if (pos === bytes.length) return c.close(); c.enqueue(bytes.slice(pos, ++pos)); } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
const staff = { form_content: 'staff instructions', form_token: 'staff-secret', inputs: [{ output_variable_name: 'human_reply', type: 'paragraph' }], actions: [{ id: 'approve' }] };
test('staff form is reduced to waiting state, without token or internal content', () => {
  const visible = publicHumanForm(staff);
  assert.equal(visible.awaitingStaff, true);
  assert.equal(visible.form_token, undefined);
  assert.equal(visible.inputs.length, 0);
  assert.equal(JSON.stringify(visible).includes('staff instructions'), false);
});
test('student issue form stays usable', () => {
  const form = { ...staff, inputs: [{ output_variable_name: 'service_issue', type: 'paragraph' }] };
  assert.equal(publicHumanForm(form).form_token, 'staff-secret');
});
test('pause followed by later completed-run poll returns the email reply', async () => {
  const waiting = await readDifyStream(stream([{ event: 'human_input_required', data: staff }, { event: 'workflow_paused', data: { status: 'paused' } }]));
  assert.equal(waiting.status, 'paused');
  assert.equal(waiting.humanForm.awaitingStaff, true);
  const completed = await readDifyStream(stream([{ event: 'workflow_finished', data: { status: 'succeeded', outputs: { answer: '你好呀' } } }]));
  assert.equal(completed.answer, '你好呀');
  assert.equal(completed.humanForm, null);
  assert.equal(completed.status, 'succeeded');
});
test('terminal event clears any replayed old form', async () => {
  const result = await readDifyStream(stream([{ event: 'human_input_required', data: staff }, { event: 'workflow_finished', data: { status: 'succeeded', outputs: { answer: '已处理' } } }]));
  assert.equal(result.humanForm, null);
  assert.equal(result.status, 'succeeded');
});
test('ordinary chat still preserves answer and knowledge sources', async () => {
  const result = await readDifyStream(stream([{ event: 'message', answer: '四人寝', conversation_id: 'c1' }, { event: 'message_end', metadata: { retriever_resources: [{ document_name: '校园资料', score: .8 }] } }]));
  assert.equal(result.answer, '四人寝');
  assert.equal(result.sources.length, 1);
  assert.equal(result.conversationId, 'c1');
});
test('staff forms cannot be submitted via the student endpoint; polling only reads', async () => {
  const calls = [];
  const route = load('app/api/human/route.ts', {
    require: name => name.includes('session') ? { sessionUser: async () => 'cookie-user' } : name === 'next/server' ? { NextResponse: Response } : { difyConfig: () => ({ base: 'https://test.invalid', headers: {} }), readDifyStream: async () => ({ status: 'succeeded', answer: '回复' }) },
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json(staff); },
  });
  const denied = await route.POST({ json: async () => ({ user: 'u1', formToken: 'old-token', action: 'approve', inputs: { human_reply: '不能自行审批' } }) });
  assert.equal(denied.status, 403);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, undefined);
  const resumed = await route.POST({ json: async () => ({ operation: 'resume', user: 'u1', workflowRunId: 'run1' }) });
  assert.equal((await resumed.json()).answer, '回复');
  assert.equal(calls[1].options.method, undefined);
  assert.match(calls[1].url, /user=cookie-user/);
});
