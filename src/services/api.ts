const API_ROOT = 'http://localhost:8000/v1';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

export function buildQuery(params?: QueryParams): string {
  if (!params || Object.keys(params).length === 0) return '';
  const search = new URLSearchParams();
  let hasValue = false;
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
      hasValue = true;
    }
  }
  
  const qs = search.toString();
  if (!qs || !hasValue) return '';
  
  return qs.startsWith('?') ? qs : `?${qs}`;
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
  query?: QueryParams;
  skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_ROOT}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      tokenStorage.setTokens(data.access_token, data.refresh_token);
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { query, skipAuth, ...rest } = options;

  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
      ...((rest.headers as Record<string, string>) || {}),
    };
    if (!(rest.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } else {
      delete headers['Content-Type'];
    }
    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const queryString = buildQuery(query);
  let url = endpoint.startsWith('http') ? endpoint : `${API_ROOT}${endpoint}`;
  
  if (queryString) {
    if (url.includes('?')) {
      url += `&${queryString.substring(1)}`;
    } else {
      url += queryString;
    }
  }

  let token = tokenStorage.getAccess();
  let response = await fetch(url, { ...rest, headers: buildHeaders(token) });

  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const newToken = await tryRefresh();
    if (newToken) {
      token = newToken;
      response = await fetch(url, { ...rest, headers: buildHeaders(token) });
    } else {
      tokenStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const data = await response.json();
      detail = typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
          : undefined;
    } catch {
      // ignore
    }
    throw new Error(detail || `${response.status} ${response.statusText} (${url})`);
  }

  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(endpoint: string, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),

  postForm: <T>(endpoint: string, data: FormData, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, { ...options, method: 'POST', body: data }),

  put: <T>(endpoint: string, data?: unknown, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data?: unknown, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),

  patchForm: <T>(endpoint: string, data: FormData, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body: data }),

  delete: <T>(endpoint: string, options: FetchOptions = {}) =>
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};

export interface PageResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}
