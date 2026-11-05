export type UserRole = 'customer' | 'manager' | 'super_manager';

export interface AuthUser {
  username: string;
  role: UserRole;
  /** Customer: their chosen branch. Manager: the branch they manage. Super manager: null. */
  branchCode: number | null;
  branchName: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  branch_code: number | null;
  branch_name: string | null;
}

export interface UserOut {
  id: number;
  username: string;
  full_name: string | null;
  age: number | null;
  mobile: string | null;
  email: string | null;
  role: UserRole;
  branch_code: number | null;
  branch_name: string | null;
}

export interface SignupPayload {
  full_name: string;
  age: number;
  mobile: string;
  email: string;
  branch_code: number;
}
