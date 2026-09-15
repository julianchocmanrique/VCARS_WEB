import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createGateway } from './gateway.mjs';

const key = 'a'.repeat(64), origin = 'https://www.viralcoproducciones.com';
async function setup(t) {
  const upstream = http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ path: req.url, cookie: req.headers.cookie, host: req.headers['x-forwarded-host'] })); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const gateway = createGateway({ key, origin, upstreamHost: '127.0.0.1', upstreamPort: upstream.address().port });
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  t.after(() => { gateway.closeAllConnections(); gateway.close(); upstream.closeAllConnections(); upstream.close(); });
  return 'http://127.0.0.1:' + gateway.address().port;
}
test('requires a strong review key and HTTPS', () => {
  assert.throws(() => createGateway({ key: '1234', origin }));
  assert.throws(() => createGateway({ key, origin: 'http://example.com' }));
});
test('blocks anonymous access to application and evidence', async t => {
  const base = await setup(t);
  for (const path of ['/vcars/', '/vcars/api/backend/service-orders/assets/test/']) assert.equal((await fetch(base + path)).status, 403);
});
test('private link establishes a VCARS-only secure cookie without expiry of the link', async t => {
  const base = await setup(t);
  const response = await fetch(base + '/vcars/acceso/' + key, { redirect: 'manual' });
  assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/vcars/');
  assert.match(response.headers.get('set-cookie'), /Path=\/vcars\/; HttpOnly; Secure; SameSite=Lax/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});
test('rejects invalid review links', async t => {
  const base = await setup(t);
  assert.equal((await fetch(base + '/vcars/acceso/wrong')).status, 403);
});
test('does not proxy Viralco pages or unrelated applications', async t => {
  const base = await setup(t);
  for (const path of ['/', '/kaptura/', '/vcars-other/']) assert.equal((await fetch(base + path, { headers: { cookie: `__Secure-vcars_preview=${key}` } })).status, 404);
});
test('strips the gateway cookie but preserves the app session and query', async t => {
  const base = await setup(t);
  const response = await fetch(base + '/vcars/orden-servicio/?plate=VCS701&startStep=2', { headers: { cookie: `__Secure-vcars_preview=${key}; api_session=example` } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.path, '/vcars/orden-servicio/?plate=VCS701&startStep=2');
  assert.doesNotMatch(data.cookie, /vcars_preview/); assert.match(data.cookie, /api_session=example/);
  assert.equal(data.host, 'www.viralcoproducciones.com');
});
test('rejects cross-origin writes even with a review cookie', async t => {
  const base = await setup(t);
  const response = await fetch(base + '/vcars/api/backend/test/', { method: 'POST', headers: { cookie: `__Secure-vcars_preview=${key}`, origin: 'https://unrelated.example' } });
  assert.equal(response.status, 403);
});
test('allows same-origin writes for the existing app authentication to handle', async t => {
  const base = await setup(t);
  const response = await fetch(base + '/vcars/api/backend/test/', { method: 'POST', headers: { cookie: `__Secure-vcars_preview=${key}`, origin } });
  assert.equal(response.status, 200);
});
