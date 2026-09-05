export type UserRole = 'customer' | 'manager';

export interface AuthUser {
  username: string;
  role: UserRole;
}

export interface RegisterPayload {
  username: string;
  password: string;
  full_name: string;
  age: number;
  mobile: string;
  email?: string | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
}

export interface UserOut {
  id: number;
  username: string;
  full_name: string | null;
  age: number | null;
  mobile: string | null;
  email: string | null;
  role: UserRole;
}
