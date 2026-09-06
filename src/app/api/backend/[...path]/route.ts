import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function joinUrl(base: string, path: string, query: string): string {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
  return p ? `${b}/${p}${query}` : `${b}${query}`;
}

function getBackendCandidates(): string[] {
  const publicApi = String(process.env.NEXT_PUBLIC_API_URL || '').trim();
  const proxyTarget = String(process.env.API_PROXY_TARGET || '').trim();
  // Never derive upstream hosts from untrusted request headers.
  const list = [
    proxyTarget,
    publicApi,
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://127.0.0.1:4000']),
  ].filter(Boolean);

  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function forward(req: NextRequest, params: { path: string[] }) {
  const path = (params.path || []).filter(Boolean).join('/').replace(/\/+$/, '');
  const query = req.nextUrl.search || '';
  const debug = process.env.NODE_ENV !== 'production' && req.nextUrl.searchParams.get('debug') === '1';
  const method = req.method.toUpperCase();
  const candidates = getBackendCandidates();
  const attemptErrors: Array<{ base: string; reason: string }> = [];

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  headers.set('accept', req.headers.get('accept') || 'application/json');
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const rawBody = method === 'GET' || method === 'HEAD' ? null : await req.text();
  let lastError = '';
  const candidateTimeoutMs = path.includes('/assets') ? 12000 : 3500;

  for (const base of candidates) {
    const url = joinUrl(base, path, query);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), candidateTimeoutMs);
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: rawBody,
          signal: controller.signal,
          cache: 'no-store',
        });
      } finally {
        clearTimeout(timeout);
      }
      const text = await res.text();
      const out = new NextResponse(text, { status: res.status });
      const ct = res.headers.get('content-type');
      if (ct) out.headers.set('content-type', ct);
      if (debug) out.headers.set('x-vcars-proxy-base', base);
      return out;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Error de red';
      if (debug) attemptErrors.push({ base, reason: lastError });
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: `No se pudo conectar al backend${lastError ? `: ${lastError}` : ''}`,
      ...(debug ? { attempts: attemptErrors, candidates } : {}),
    },
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
