const API_ROOT = 'http://localhost:8000/v1';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_ROOT}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data: any, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  postForm: <T>(endpoint: string, data: FormData, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'POST', body: data }),
    
  put: <T>(endpoint: string, data: any, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  patch: <T>(endpoint: string, data: any, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    
  patchForm: <T>(endpoint: string, data: FormData, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'PATCH', body: data }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
};
