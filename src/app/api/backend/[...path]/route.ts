import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';

export const dynamic = 'force-dynamic';

function joinUrl(base: string, path: string, query: string): string {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  return `${b}/${p}${query}`;
}

function parseHost(hostHeader: string | null): string {
  const raw = String(hostHeader || '').trim();
  if (!raw) return '127.0.0.1';
  return raw.split(':')[0] || '127.0.0.1';
}

function hexLittleEndianToIpv4(value: string): string | null {
  const v = String(value || '').trim();
  if (!/^[0-9a-fA-F]{8}$/.test(v)) return null;
  const bytes = v.match(/../g);
  if (!bytes || bytes.length !== 4) return null;
  const parts = bytes.reverse().map((part) => Number.parseInt(part, 16));
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.join('.');
}

function getRouteGateways(): string[] {
  try {
    const raw = readFileSync('/proc/net/route', 'utf8');
    const lines = raw.split('\n').slice(1);
    const ips = new Set<string>();
    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 3) continue;
      const destination = cols[1];
      const gatewayHex = cols[2];
      if (destination !== '00000000') continue;
      const ip = hexLittleEndianToIpv4(gatewayHex);
      if (ip) ips.add(ip);
    }
    return Array.from(ips);
  } catch {
    return [];
  }
}

function getBackendCandidates(req: NextRequest): string[] {
  const host = parseHost(req.headers.get('host'));
  const fromEnv = String(process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || '').trim();
  const gateways = getRouteGateways();
  const list = [
    fromEnv,
    `http://${host}:4000`,
    `http://${host}:4010`,
    ...gateways.map((ip) => `http://${ip}:4000`),
    ...gateways.map((ip) => `http://${ip}:4010`),
    'http://172.22.0.1:4000',
    'http://172.22.0.1:4010',
    'http://172.17.0.1:4000',
    'http://172.17.0.1:4010',
    'http://host.docker.internal:4010',
    'http://host.docker.internal:4000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:4010',
  ].filter(Boolean);

  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.replace(/\/+$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function forward(req: NextRequest, params: { path: string[] }) {
  const path = (params.path || []).join('/');
  const query = req.nextUrl.search || '';
  const method = req.method.toUpperCase();
  const candidates = getBackendCandidates(req);

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  headers.set('accept', req.headers.get('accept') || 'application/json');
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const rawBody = method === 'GET' || method === 'HEAD' ? null : await req.text();
  let lastError = '';

  for (const base of candidates) {
    const url = joinUrl(base, path, query);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(url, {
        method,
        headers,
        body: rawBody,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      const text = await res.text();
      const out = new NextResponse(text, { status: res.status });
      const ct = res.headers.get('content-type');
      if (ct) out.headers.set('content-type', ct);
      return out;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Error de red';
    }
  }

  return NextResponse.json(
    { ok: false, error: `No se pudo conectar al backend${lastError ? `: ${lastError}` : ''}` },
    { status: 502 },
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}
