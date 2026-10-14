import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
class Element {
  value=''; textContent=''; hidden=false; disabled=false; dataset={apiOrigin:'https://api-emitta.nexorf.dev'};
  listeners=new Map<string, (event:unknown)=>Promise<void>>(); fields: Record<string,unknown>={}; children=new Map<string,Element>();
  addEventListener(name:string,handler:(event:unknown)=>Promise<void>){this.listeners.set(name,handler);}
  querySelector(selector:string){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector)!;}
  reset(){this.fields={};}
  append(){} setAttribute(){}
}
class Form {
  data: Map<string,unknown>;
  constructor(element:Element){this.data=new Map(Object.entries(element.fields));}
  entries(){return this.data.entries();} get(key:string){return this.data.get(key);} getAll(key:string){return [this.get(key)];}
  delete(key:string){this.data.delete(key);} set(key:string,value:unknown){this.data.set(key,value);}
}
const elements=new Map<string,Element>();
function element(id:string){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)!;}
const tenant='00000000-0000-4000-8000-000000000001';
const taxpayer='00000000-0000-4000-8000-000000000002';
const establishment='00000000-0000-4000-8000-000000000003';
const calls: Array<{path:string;body:Record<string,unknown>}> = [];
let failClientCreation=false;
const context={exports:{},document:{getElementById:element,querySelectorAll:()=>[...elements.values()],createElement:()=>new Element()},window:{addEventListener(){}},Headers,Response,AbortSignal,TextDecoder,Uint8Array,atob,Date,FormData:Form,setTimeout:()=>1,clearTimeout(){},confirm:()=>true,
  fetch:async(url:string,options:{method?:string;body?:string})=>{
    const path=new URL(url).pathname;const body=options.body?JSON.parse(options.body):{};calls.push({path,body});
    if(failClientCreation && path.endsWith('/api-clients') && options.method==='POST')throw new Error('Synthetic disconnection');
    let response:unknown=[];
    if(path.endsWith('/auth/token'))response={accessToken:'example.'+Buffer.from(JSON.stringify({tenant_id:tenant,scope:['platform:admin'],exp:Date.now()/1000+600})).toString('base64url')+'.example'};
    else if(path==='/api/v1/tenants'&&options.method==='POST')response={id:tenant,name:'Synthetic organisation'};
    else if(path.endsWith('/api-clients')&&options.method==='POST')response={clientId:'fixture',clientSecret:'fixture'};
    else if(path.endsWith('/taxpayers'))response={id:taxpayer};
    else if(path.endsWith('/establishments'))response={id:establishment};
    else if(path.endsWith('/fiscal-configuration')&&options.method==='POST')response={taxpayerId:taxpayer,establishmentId:establishment,pointOfIssueId:'00000000-0000-4000-8000-000000000004',environment:'TEST'};
    else if(path.endsWith('/fiscal-configuration'))response=[{taxpayerId:taxpayer,ruc:'1790000000001',legalName:'SYNTHETIC ISSUER',pointOfIssueId:'00000000-0000-4000-8000-000000000004',establishmentCode:'001',pointOfIssueCode:'001'}];
    return new Response(JSON.stringify(response),{headers:{'Content-Type':'application/json'}});
  }};
vm.runInNewContext(ts.transpileModule(readFileSync('src/scripts/admin.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
async function submit(id:string,fields:Record<string,unknown>){const form=element(id);form.fields=fields;await form.listeners.get('submit')!({preventDefault(){},currentTarget:form});}
await submit('login-form',{clientId:'fixture',clientSecret:'fixture'});
await submit('tenant-form',{name:'Synthetic organisation'});
assert.equal(element('selected-tenant').value,tenant);
assert.equal(element('selected-tenant-name').textContent,'Synthetic organisation');
assert.deepEqual(calls.find(call=>call.path.endsWith('/api-clients')&&call.body.scopes)!.body.scopes,['invoices:write','documents:read','artifacts:read']);
assert.ok(element('new-credentials').textContent.includes('fixture'));
await submit('client-form',{name:'Synthetic integration',profile:'integration'});
assert.deepEqual(calls.at(-2)!.body.scopes,['invoices:write','documents:read','artifacts:read']);
await submit('client-form',{name:'Synthetic admin',profile:'administration'});
assert.deepEqual(calls.at(-2)!.body.scopes,['taxpayers:write','establishments:write','points-of-issue:write','certificates:write','certificates:read']);
await submit('client-form',{name:'Synthetic self managed',profile:'self-managed'});
assert.deepEqual(calls.at(-2)!.body.scopes,['invoices:write','documents:read','artifacts:read','taxpayers:write','establishments:write','points-of-issue:write','certificates:write','certificates:read']);
await submit('fiscal-setup-form',{ruc:'1790000000001',legalName:'SYNTHETIC ISSUER',mainAddress:'Synthetic address',establishmentCode:'001',pointOfIssueCode:'001'});
assert.ok(calls.some(call=>call.path===`/api/v1/tenants/${tenant}/fiscal-configuration`&&call.body.taxpayer));
assert.equal(element('certificate-form').querySelector('[name="taxpayerId"]').value,taxpayer);
const before=calls.length;await submit('client-form',{name:'Invalid profile',profile:'platform:admin'});assert.equal(calls.length,before);
await submit('taxpayer-form',{ruc:'fixture'});
assert.equal(element('establishment-form').querySelector('[name="taxpayerId"]').value,taxpayer);
assert.equal(element('certificate-form').querySelector('[name="taxpayerId"]').value,taxpayer);
await submit('establishment-form',{taxpayerId:taxpayer,code:'001'});
assert.equal(element('point-form').querySelector('[name="establishmentId"]').value,establishment);
failClientCreation=true;
await submit('tenant-form',{name:'Synthetic partial creation'});
assert.ok(element('notice').textContent.includes('El negocio se guardó'));
const partialCalls=calls.length;
await submit('tenant-form',{name:'Synthetic partial creation'});
assert.equal(calls.length,partialCalls,'No automatic duplicate creation after uncertain client response');
await element('logout').listeners.get('click')!({});assert.equal(element('selected-tenant').value,'');assert.equal(element('platform-section').hidden,true);
console.log('Administrative flow verified with synthetic responses: selection, two least-privilege profiles, invalid profile blocked, fiscal identifier propagation and logout cleanup. No network calls.');
