import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { LoanApplicationService } from '../loan-application.service';
import { LOAN_TYPES } from '../models';

@Component({
  selector: 'app-loan-application-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './loan-application-page.html',
  styleUrl: './loan-application-page.scss',
})
export class LoanApplicationPage {
  private fb = inject(FormBuilder);
  private loanService = inject(LoanApplicationService);
  private auth = inject(AuthService);

  isLoggedIn = this.auth.isLoggedIn;

  isOpen = signal(false);
  submitting = signal(false);
  submittedId = signal<number | null>(null);
  errorMessage = signal<string | null>(null);

  loanTypes = LOAN_TYPES;

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    email: ['', [Validators.email]],
    loan_type: ['', [Validators.required]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1000)]),
    tenure_months: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(360)]),
    purpose: [''],
    address: [''],
  });

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  field(name: keyof typeof this.form.controls) {
    return this.form.controls[name];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    this.loanService
      .submit({
        full_name: raw.full_name,
        mobile: raw.mobile,
        email: raw.email || null,
        loan_type: raw.loan_type,
        amount: raw.amount!,
        tenure_months: raw.tenure_months!,
        purpose: raw.purpose || null,
        address: raw.address || null,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.submittedId.set(res.id);
          this.form.reset();
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Something went wrong submitting your application. Please try again.');
        },
      });
  }

  dismissConfirmation(): void {
    this.submittedId.set(null);
  }
}
