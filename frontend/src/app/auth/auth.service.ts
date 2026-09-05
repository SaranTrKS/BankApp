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
  private verifyingSignal = signal<boolean>(this.tokenSignal() !== null);
  private readyPromise: Promise<void>;

  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly isManager = computed(() => this.userSignal()?.role === 'manager');
  readonly verifying = this.verifyingSignal.asReadonly();

  get token(): string | null {
    return this.tokenSignal();
  }

  constructor() {
    // A token restored from localStorage could be stale, expired, or from a browser profile
    // someone else used on this machine — it must be re-checked against the backend before
    // any manager/customer UI trusts it. Without this, a leftover token from a prior session
    // (that never explicitly logged out) would silently grant access on the next visit.
    //
    // The verification call is deferred to a microtask (not fired directly here) because
    // authInterceptor calls inject(AuthService) to read the token, and doing that while this
    // constructor is still running trips Angular's circular-dependency guard (NG0200) — the
    // singleton isn't considered fully constructed until this constructor returns.
    this.readyPromise = this.tokenSignal() ? Promise.resolve().then(() => this.verifySession()) : Promise.resolve();
  }

  /** Resolves once any restored session has been verified against the backend (or immediately if there was none). */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private verifySession(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<UserOut>(`${API_BASE}/auth/me`).subscribe({
        next: (user) => {
          this.userSignal.set({ username: user.username, role: user.role });
          this.verifyingSignal.set(false);
          resolve();
        },
        error: () => {
          this.clearSession();
          this.verifyingSignal.set(false);
          resolve();
        },
      });
    });
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
    this.clearSession();
  }

  private clearSession(): void {
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
