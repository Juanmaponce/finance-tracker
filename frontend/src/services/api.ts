import type { ApiResponse } from '@/types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private getAccessToken(): string | null {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed?.state?.tokens?.accessToken || null;
    } catch {
      return null;
    }
  }

  private getRefreshToken(): string | null {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed?.state?.tokens?.refreshToken || null;
    } catch {
      return null;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data: ApiResponse<{ accessToken: string; refreshToken: string }> =
        await response.json();
      if (!data.success) return false;

      // Update tokens in localStorage (Zustand persist)
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.state.tokens = data.data;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }

      return true;
    } catch {
      return false;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401, try to refresh the token and retry
    if (response.status === 401 && accessToken) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        const newToken = this.getAccessToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      const message = data.message || 'Something went wrong';
      throw new ApiError(message, response.status, data.errors);
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      ...(body && { body: JSON.stringify(body) }),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
