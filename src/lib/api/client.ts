const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiClient {
  /**
   * Initialize or get guest session ID
   */
  private static getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('guest_session_id', sessionId);
    }
    return sessionId;
  }

  private static getHeaders(includeAuth: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add session ID for guest users
    const sessionId = this.getOrCreateSessionId();
    headers['x-session-id'] = sessionId;

    return headers;
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = false
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const sessionId = this.getOrCreateSessionId();
    console.log('[ApiClient] Request:', url, 'Method:', options.method || 'GET', 'Auth:', includeAuth, 'Session:', sessionId);
    
    const response = await fetch(url, {
      headers: this.getHeaders(includeAuth),
      ...options,
    });

    console.log('[ApiClient] Response status:', response.status, 'OK:', response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[ApiClient] Error response:', error);
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ApiClient] Success response received');
    return data;
  }

  // GET requests
  static get<T>(endpoint: string, includeAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, includeAuth);
  }

  // POST requests
  static post<T>(endpoint: string, data?: any, includeAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, includeAuth);
  }

  // PUT requests
  static put<T>(endpoint: string, data?: any, includeAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, includeAuth);
  }

  // DELETE requests
  static delete<T>(endpoint: string, includeAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, includeAuth);
  }

  // File upload
  static async uploadFile(endpoint: string, file: File, includeAuth: boolean = false): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (includeAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `Upload Error: ${response.status}`);
    }

    return response.json();
  }

  // Generic POST with FormData (multipart/form-data)
  static async postFormData<T>(endpoint: string, formData: FormData, includeAuth: boolean = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (includeAuth) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Add session ID for guest users
    const sessionId = this.getOrCreateSessionId();
    headers['x-session-id'] = sessionId;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request Error: ${response.status}`);
    }

    return response.json();
  }
}

export default ApiClient;
