const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const {webcrypto} = require('node:crypto');
const moduleObject = {exports:{}};
const code=ts.transpileModule(fs.readFileSync('lib/session.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{module:moduleObject,exports:moduleObject.exports,crypto:webcrypto,TextEncoder,Uint8Array,process:{env:{SESSION_SECRET:'test-only-secret'}}});
const {createSession,verifySession,sessionUser}=moduleObject.exports;
test('separate visitors have separate stable identities',async()=>{
 const a=await createSession(),b=await createSession();
 assert.notEqual(await verifySession(a),await verifySession(b));
 assert.equal(await verifySession(a),await verifySession(a));
});
test('forged, missing, or altered session cannot select another visitor',async()=>{
 const a=await createSession(),b=await createSession();
 assert.equal(await verifySession(b.split('.')[0]+'.'+a.split('.')[1]),null);
 assert.equal(await verifySession('web-user'),null);
 assert.equal(await verifySession(),null);
 await assert.rejects(()=>sessionUser({cookies:{get:()=>undefined}}));
});
test('request body and query user cannot override cookie identity',async()=>{
 const token=await createSession();
 assert.equal(await sessionUser({cookies:{get:()=>({value:token})},body:{user:'victim'},user:'victim'}),await verifySession(token));
});
