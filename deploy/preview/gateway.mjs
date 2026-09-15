import http from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function createGateway({ key, origin, upstreamHost = 'web', upstreamPort = 3000 }) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('A private review key is required.');
  if (new URL(origin).protocol !== 'https:') throw new Error('HTTPS is required.');
  const cookieName = '__Secure-vcars_preview';
  const sameKey = value => {
    const bytes = Buffer.from(value || '');
    return bytes.length === key.length && timingSafeEqual(bytes, Buffer.from(key));
  };
  const common = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' };
  const reply = (res, status, text) => { res.writeHead(status, { ...common, 'content-type': 'text/plain; charset=utf-8' }); res.end(text); };
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname.startsWith('/vcars/acceso/')) {
      if (!sameKey(url.pathname.slice('/vcars/acceso/'.length))) return reply(res, 403, 'Enlace de acceso no valido.');
      res.writeHead(303, { ...common, location: '/vcars/', 'set-cookie': `${cookieName}=${key}; Path=/vcars/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` });
      return res.end();
    }
    if (url.pathname !== '/vcars' && !url.pathname.startsWith('/vcars/')) return reply(res, 404, 'Pagina no encontrada.');
    const access = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!sameKey(access)) return reply(res, 403, 'VCARS: acceso privado. Abre el enlace completo de revision que te compartieron.');
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(req.method)) return reply(res, 405, 'Metodo no permitido.');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== origin))) return reply(res, 403, 'Origen no permitido.');
    if (Number(req.headers['content-length']) > 25 * 1024 * 1024) return reply(res, 413, 'Archivo demasiado grande.');
    const headers = { ...req.headers, host: `${upstreamHost}:${upstreamPort}`, 'x-forwarded-host': new URL(origin).host, 'x-forwarded-proto': 'https' };
    for (const name of ['connection', 'upgrade', 'proxy-authorization', 'proxy-connection', 'keep-alive', 'te', 'trailer', 'transfer-encoding', 'forwarded']) delete headers[name];
    headers.cookie = (req.headers.cookie || '').split(';').filter(s => !s.trim().startsWith(`${cookieName}=`)).join(';');
    const request = http.request({ hostname: upstreamHost, port: upstreamPort, path: req.url, method: req.method, headers }, response => {
      const responseHeaders = { ...response.headers, ...common };
      delete responseHeaders.connection;
      const localPrefix = `http://${upstreamHost}:${upstreamPort}/`;
      if (responseHeaders.location?.startsWith(localPrefix)) responseHeaders.location = '/' + responseHeaders.location.slice(localPrefix.length);
      res.writeHead(response.statusCode, responseHeaders); response.pipe(res);
    });
    let bytes = 0;
    req.on('data', chunk => { bytes += chunk.length; if (bytes > 25 * 1024 * 1024) { request.destroy(); if (!res.headersSent) reply(res, 413, 'Archivo demasiado grande.'); } });
    req.on('aborted', () => request.destroy());
    res.on('close', () => request.destroy());
    request.setTimeout(60000, () => request.destroy());
    request.on('error', () => { if (!res.headersSent) reply(res, 502, 'VCARS se esta actualizando. Intenta de nuevo en un momento.'); else res.destroy(); });
    req.pipe(request);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const key = readFileSync('/run/secrets/review-key', 'utf8').trim();
  const server = createGateway({ key, origin: process.env.PUBLIC_ORIGIN });
  server.requestTimeout = 90000; server.headersTimeout = 15000;
  server.listen(3000, '0.0.0.0');
  process.on('SIGTERM', () => server.close());
}
