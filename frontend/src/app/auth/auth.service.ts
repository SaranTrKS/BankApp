import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthUser, LoginPayload, RegisterPayload, TokenResponse, UserOut } from './models';

const API_BASE = 'http://127.0.0.1:8000';
const STORAGE_KEY = 'bankapp_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private userSignal = signal<AuthUser | null>(this.readStoredAuth()?.user ?? null);
  private tokenSignal = signal<string | null>(this.readStoredAuth()?.token ?? null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly isManager = computed(() => this.userSignal()?.role === 'manager');

  get token(): string | null {
    return this.tokenSignal();
  }

  login(payload: LoginPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE}/auth/login`, payload).pipe(
      tap((res) => {
        this.userSignal.set({ username: res.username, role: res.role });
        this.tokenSignal.set(res.access_token);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      })
    );
  }

  register(payload: RegisterPayload): Observable<UserOut> {
    return this.http.post<UserOut>(`${API_BASE}/auth/register`, payload);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.userSignal.set(null);
    this.tokenSignal.set(null);
  }

  private readStoredAuth(): { user: AuthUser; token: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TokenResponse;
      return { user: { username: parsed.username, role: parsed.role }, token: parsed.access_token };
    } catch {
      return null;
    }
  }
}
