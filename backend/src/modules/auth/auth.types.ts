export interface RegisterDTO {
  email: string;
  password: string;
  displayName: string;
  primaryCurrency?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: AuthTokens;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  primaryCurrency: string;
  darkMode: boolean;
  locale: string;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
}
