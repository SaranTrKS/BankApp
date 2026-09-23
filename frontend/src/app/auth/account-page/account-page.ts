import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GOOGLE_CLIENT_ID } from '../google-client-id';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  @ViewChild('googleBtn') private googleBtnRef?: ElementRef<HTMLElement>;

  private auth = inject(AuthService);
  private router = inject(Router);

  isOpen = signal(false);
  errorMessage = signal<string | null>(null);
  notConfigured = signal(!GOOGLE_CLIENT_ID);

  currentUser = this.auth.currentUser;
  isLoggedIn = this.auth.isLoggedIn;
  isManager = this.auth.isManager;

  toggle(): void {
    this.isOpen.update((v) => !v);
    // The Google button's container only exists in the DOM once the panel is open
    // (it's behind an @if), so (re-)render into it after this change detection pass.
    if (this.isOpen() && !this.auth.isLoggedIn() && GOOGLE_CLIENT_ID) {
      setTimeout(() => this.setUpGoogleButton(), 0);
    }
  }

  private setUpGoogleButton(attempt = 0): void {
    if (this.auth.isLoggedIn()) return;
    if (!window.google) {
      if (attempt > 40) {
        this.errorMessage.set('Could not load Google Sign-In. Check your connection and reload the page.');
        return;
      }
      setTimeout(() => this.setUpGoogleButton(attempt + 1), 100);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => this.onGoogleCredential(response.credential),
    });
    if (this.googleBtnRef) {
      window.google.accounts.id.renderButton(this.googleBtnRef.nativeElement, {
        theme: 'outline',
        size: 'large',
        width: 280,
      });
    }
  }

  private onGoogleCredential(credential: string): void {
    this.errorMessage.set(null);
    this.auth.loginWithGoogle(credential).subscribe({
      next: (res) => {
        this.isOpen.set(false);
        this.router.navigateByUrl(res.role === 'manager' ? '/manager' : '/');
      },
      error: (err) => {
        this.errorMessage.set(
          err?.status === 0
            ? 'Could not reach the server. Is the backend running?'
            : err?.error?.detail || 'Could not sign in with Google. Please try again.'
        );
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
