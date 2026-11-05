import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, SignupPayload, TokenResponse, UserOut, UserRole } from './models';

const API_BASE = environment.apiBase;
const STORAGE_KEY = 'bankapp_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private userSignal = signal<AuthUser | null>(null);
  private tokenSignal = signal<string | null>(localStorage.getItem(STORAGE_KEY));
  private verifyingSignal = signal<boolean>(this.tokenSignal() !== null);
  private readyPromise: Promise<void>;

  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  /** True for branch managers and super managers — both use the /manager page. */
  readonly isManager = computed(() => isManagerRole(this.userSignal()?.role));
  readonly isSuperManager = computed(() => this.userSignal()?.role === 'super_manager');
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
    // The refresh call is deferred to a microtask (not fired directly here) because
    // authInterceptor calls inject(AuthService) to read the token, and doing that while this
    // constructor is still running trips Angular's circular-dependency guard (NG0200) — the
    // singleton isn't considered fully constructed until this constructor returns.
    this.readyPromise = this.tokenSignal() ? Promise.resolve().then(() => this.refreshProfile()) : Promise.resolve();
  }

  /** Resolves once any restored session has been verified against the backend (or immediately if there was none). */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private refreshProfile(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<UserOut>(`${API_BASE}/auth/me`).subscribe({
        next: (user) => {
          this.userSignal.set(toAuthUser(user));
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

  /** Sends an OTP to an already-registered email. The caller should check for a 404 (not registered) to offer signup instead. */
  requestOtp(email: string): Observable<unknown> {
    return this.http.post(`${API_BASE}/auth/request-otp`, { email });
  }

  /** Creates a new account and sends it an OTP to verify. */
  signup(payload: SignupPayload): Observable<unknown> {
    return this.http.post(`${API_BASE}/auth/signup`, payload);
  }

  /** Verifies the OTP and exchanges it for our own session. */
  verifyOtp(email: string, otp: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE}/auth/verify-otp`, { email, otp }).pipe(
      tap((res) => {
        this.tokenSignal.set(res.access_token);
        localStorage.setItem(STORAGE_KEY, res.access_token);
      }),
      switchMap((res) =>
        this.http
          .get<UserOut>(`${API_BASE}/auth/me`)
          .pipe(tap((user) => this.userSignal.set(toAuthUser(user))), map(() => res))
      )
    );
  }

  logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.userSignal.set(null);
    this.tokenSignal.set(null);
  }
}

export function isManagerRole(role: UserRole | undefined): boolean {
  return role === 'manager' || role === 'super_manager';
}

function toAuthUser(user: UserOut): AuthUser {
  return { username: user.username, role: user.role, branchCode: user.branch_code, branchName: user.branch_name };
}
