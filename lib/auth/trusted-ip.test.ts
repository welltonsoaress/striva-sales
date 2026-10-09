import { expect,it } from 'vitest';
import { trustedIp } from './trusted-ip';
it('ignora origem forjada e cadeia arbitrária de encaminhamento',()=>{
  expect(trustedIp(new Headers({'x-forwarded-for':'203.0.113.10','x-real-ip':'203.0.113.10'}),'qa-proxy-secret')).toBeNull();
  expect(trustedIp(new Headers({'x-real-ip':'203.0.113.10','x-platform-proxy-token':'wrong'}),'qa-proxy-secret')).toBeNull();
});
it('aceita somente endereço único após autenticar o proxy',()=>{
  const headers=new Headers({'x-real-ip':'203.0.113.10','x-platform-proxy-token':'qa-proxy-secret'});
  expect(trustedIp(headers,'qa-proxy-secret')).toBe('203.0.113.10');
  headers.set('x-real-ip','203.0.113.10, 203.0.113.11');
  expect(trustedIp(headers,'qa-proxy-secret')).toBeNull();
  expect(trustedIp(headers,'')).toBeNull();
});
