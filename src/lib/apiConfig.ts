export function getApiBaseUrl(): string {
  const raw = import.meta.env?.VITE_API_BASE_URL;
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function shouldAttemptBackendApi(): boolean {
  if (getApiBaseUrl()) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const host = window.location.hostname.toLowerCase();
  // GitHub Pages is purely static: without VITE_API_BASE_URL configured,
  // avoid dead /api/* requests and use the local diplomatic engine directly.
  if (host.endsWith('.github.io')) {
    return false;
  }
  return true;
}
