import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  isOpen = signal(false);
  activeTab = signal<'login' | 'register'>('login');
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  registerSuccess = signal(false);

  currentUser = this.auth.currentUser;
  isLoggedIn = this.auth.isLoggedIn;
  isManager = this.auth.isManager;

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  registerForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    age: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.email]],
  });

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  registerField(name: keyof typeof this.registerForm.controls) {
    return this.registerForm.controls[name];
  }

  setTab(tab: 'login' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.registerSuccess.set(false);
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please enter your username and password.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.isOpen.set(false);
        this.loginForm.reset();
        this.router.navigateByUrl(res.role === 'manager' ? '/manager' : '/');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.status === 0 ? 'Could not reach the server. Is the backend running?' : 'Incorrect username or password.');
      },
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Please fix the highlighted fields below.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const raw = this.registerForm.getRawValue();
    this.auth
      .register({
        username: raw.username,
        password: raw.password,
        full_name: raw.full_name,
        age: raw.age!,
        mobile: raw.mobile,
        email: raw.email || null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.registerSuccess.set(true);
          this.registerForm.reset();
          this.setTab('login');
          this.registerSuccess.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(this.extractErrorMessage(err));
        },
      });
  }

  private extractErrorMessage(err: any): string {
    if (err?.status === 0) {
      return 'Could not reach the server. Make sure the backend is running (see README).';
    }
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(' ');
    }
    return 'Could not create account. Please try again.';
  }

  logout(): void {
    this.auth.logout();
  }
}
