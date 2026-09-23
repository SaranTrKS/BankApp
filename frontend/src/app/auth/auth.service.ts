import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, CompleteProfilePayload, TokenResponse, UserOut } from './models';

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
  readonly isManager = computed(() => this.userSignal()?.role === 'manager');
  readonly needsProfileCompletion = computed(() => {
    const user = this.userSignal();
    return !!user && user.role === 'customer' && (user.age === null || user.mobile === null);
  });
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

  /** Exchanges a Google ID token (the `credential` from the Sign in with Google button) for our own session. */
  loginWithGoogle(credential: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE}/auth/google`, { credential }).pipe(
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

  completeProfile(payload: CompleteProfilePayload): Observable<UserOut> {
    return this.http
      .patch<UserOut>(`${API_BASE}/auth/complete-profile`, payload)
      .pipe(tap((user) => this.userSignal.set(toAuthUser(user))));
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

function toAuthUser(user: UserOut): AuthUser {
  return { username: user.username, role: user.role, age: user.age, mobile: user.mobile };
}
