import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  isOpen = signal(false);
  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  step = signal<'email' | 'signup' | 'otp'>('email');
  email = signal('');
  otp = signal('');

  signupFullName = signal('');
  signupAge = signal('');
  signupMobile = signal('');

  currentUser = this.auth.currentUser;
  isLoggedIn = this.auth.isLoggedIn;
  isManager = this.auth.isManager;

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  continueWithEmail(): void {
    const value = this.email().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.errorMessage.set('Enter a valid email address.');
      return;
    }
    this.email.set(value);
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.requestOtp(value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.step.set('otp');
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 404) {
          this.step.set('signup');
        } else {
          this.errorMessage.set(this.extractErrorMessage(err));
        }
      },
    });
  }

  submitSignup(): void {
    const fullName = this.signupFullName().trim();
    const age = Number(this.signupAge());
    const mobile = this.signupMobile().trim();

    if (fullName.length < 2) {
      this.errorMessage.set('Enter your full name (min 2 characters).');
      return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      this.errorMessage.set('Enter a valid age (1-120).');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.errorMessage.set('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.signup({ full_name: fullName, age, mobile, email: this.email() }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.step.set('otp');
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 400) {
          this.errorMessage.set('An account with this email already exists — please sign in instead.');
          this.step.set('email');
        } else {
          this.errorMessage.set(this.extractErrorMessage(err));
        }
      },
    });
  }

  verifyOtp(): void {
    const code = this.otp().trim();
    if (!/^\d{6}$/.test(code)) {
      this.errorMessage.set('Enter the 6-digit code sent to your email.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.verifyOtp(this.email(), code).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.isOpen.set(false);
        this.resetFlow();
        this.router.navigateByUrl(res.role === 'manager' ? '/manager' : '/');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(this.extractErrorMessage(err));
      },
    });
  }

  useAnotherEmail(): void {
    this.resetFlow();
  }

  private resetFlow(): void {
    this.step.set('email');
    this.email.set('');
    this.otp.set('');
    this.signupFullName.set('');
    this.signupAge.set('');
    this.signupMobile.set('');
  }

  private extractErrorMessage(err: { status?: number; error?: { detail?: string } }): string {
    if (err?.status === 0) {
      return 'Could not reach the server. Is the backend running?';
    }
    return err?.error?.detail || 'Something went wrong. Please try again.';
  }

  logout(): void {
    this.auth.logout();
    this.resetFlow();
  }
}
