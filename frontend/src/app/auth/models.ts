export type UserRole = 'customer' | 'manager';

export interface AuthUser {
  username: string;
  role: UserRole;
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

export interface SignupPayload {
  full_name: string;
  age: number;
  mobile: string;
  email: string;
}
