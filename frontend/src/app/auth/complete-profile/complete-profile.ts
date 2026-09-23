import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.scss',
})
export class CompleteProfile {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  currentUser = this.auth.currentUser;

  form = this.fb.nonNullable.group({
    age: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
  });

  field(name: keyof typeof this.form.controls) {
    return this.form.controls[name];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please fix the highlighted fields below.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    this.auth.completeProfile({ age: raw.age!, mobile: raw.mobile }).subscribe({
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.status === 0 ? 'Could not reach the server. Is the backend running?' : 'Could not save your details. Please try again.'
        );
      },
      // On success the AuthService signal updates and this component is swapped out by home-page.
    });
  }
}
