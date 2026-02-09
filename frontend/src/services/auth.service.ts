import { api } from './api';
import type {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '@/types/auth';

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  return response.data;
}

export async function registerUser(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', credentials);
  return response.data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function getProfile(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/profile');
  return response.data;
}
