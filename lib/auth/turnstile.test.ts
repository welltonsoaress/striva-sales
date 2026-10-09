import { afterEach,expect,it,vi } from 'vitest';
const config=vi.hoisted(()=>({TURNSTILE_SECRET_KEY:'qa-secret',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'qa-site',NEXT_PUBLIC_APP_URL:'https://qa.example.test'}));
vi.mock('@/lib/env',()=>({env:config}));
import { verifyTurnstile } from './turnstile';
afterEach(()=>{vi.unstubAllGlobals();config.TURNSTILE_SECRET_KEY='qa-secret';});
it('confere resposta, hostname e finalidade no servidor',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({success:true,hostname:'qa.example.test',action:'trial_activation'})});vi.stubGlobal('fetch',fetch);
  expect(await verifyTurnstile('qa-token','trial_activation',null,true)).toBe(true);
  expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({secret:'qa-secret',response:'qa-token'});
  expect(await verifyTurnstile('qa-token','signup',null,true)).toBe(false);
  fetch.mockResolvedValue({ok:true,json:async()=>({success:true,hostname:'forged.test',action:'trial_activation'})});
  expect(await verifyTurnstile('qa-token','trial_activation',null,true)).toBe(false);
});
it('recusa token vencido/reutilizado, falha de rede e secret ausente',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({success:false,'error-codes':['timeout-or-duplicate']})}));
  expect(await verifyTurnstile('used','trial_activation',null,true)).toBe(false);
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  expect(await verifyTurnstile('token','trial_activation',null,true)).toBe(false);
  config.TURNSTILE_SECRET_KEY='';expect(await verifyTurnstile('token','trial_activation',null,true)).toBe(false);
});
