const DEFAULT_API_URL = 'http://localhost:4000';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function normalizeBaseUrl(url: string): string {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  return normalizeBaseUrl(raw);
}

export function getApiBaseUrlCandidates(): string[] {
  const list: string[] = [];
  const explicit = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || '');
  if (explicit) list.push(explicit);

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    const origin = window.location.origin || `${protocol}//${hostname}`;
    list.unshift(`${origin}${String(BASE_PATH).replace(/\/+$/, '')}/api/backend`);
    if (hostname) {
      list.push(`${protocol}//${hostname}:4010`);
      list.push(`${protocol}//${hostname}:4000`);
    }
  }

  list.push(DEFAULT_API_URL);

  const seen = new Set<string>();
  return list
    .map((item) => normalizeBaseUrl(item))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}
