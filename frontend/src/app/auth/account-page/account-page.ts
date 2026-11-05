import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BranchService } from '../../branches/branch.service';
import { distanceKm, googleMapsUrl } from '../../branches/distance';
import { Branch, LatLng } from '../../branches/models';
import { AuthService, isManagerRole } from '../auth.service';
import { UserRole } from '../models';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'customer',
  manager: 'branch manager',
  super_manager: 'super manager',
};

const BRANCH_REQUIRED = 'Choose your branch.';

interface BranchOption {
  branch: Branch;
  /** null when the visitor's location isn't available. */
  km: number | null;
}

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  private auth = inject(AuthService);
  private branchService = inject(BranchService);
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
  signupBranchCode = signal<number | null>(null);

  branches = signal<Branch[]>([]);
  branchesError = signal(false);
  // The visitor's location never leaves the browser — it's only used to sort the dropdown.
  location = signal<LatLng | null>(null);
  locationState = signal<'idle' | 'locating' | 'found' | 'unavailable'>('idle');

  /** Nearest first when we know where the visitor is, otherwise in branch-code order. */
  branchOptions = computed<BranchOption[]>(() => {
    const here = this.location();
    const options = this.branches().map((branch) => ({ branch, km: here ? distanceKm(here, branch) : null }));
    return here ? options.sort((a, b) => a.km! - b.km!) : options;
  });
  selectedBranch = computed(() => this.branches().find((b) => b.code === this.signupBranchCode()) ?? null);

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
          this.prepareBranchPicker();
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
    const branchCode = this.signupBranchCode();
    if (branchCode === null) {
      this.errorMessage.set(BRANCH_REQUIRED);
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth.signup({ full_name: fullName, age, mobile, email: this.email(), branch_code: branchCode }).subscribe({
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
        this.router.navigateByUrl(isManagerRole(res.role) ? '/manager' : '/');
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
    this.signupBranchCode.set(null);
  }

  selectBranch(code: number): void {
    this.signupBranchCode.set(code);
    if (this.errorMessage() === BRANCH_REQUIRED) this.errorMessage.set(null);
  }

  roleLabel(role: UserRole | undefined): string {
    return role ? ROLE_LABELS[role] : '';
  }

  branchLabel(option: BranchOption): string {
    const base = `${option.branch.name} (${option.branch.code})`;
    return option.km === null ? base : `${base} — ~${formatKm(option.km)}`;
  }

  mapUrl(branch: Branch): string {
    return googleMapsUrl(branch);
  }

  private prepareBranchPicker(): void {
    if (!this.branches().length) {
      this.branchesError.set(false);
      this.branchService.getBranches().subscribe({
        next: (list) => this.branches.set(list),
        error: () => this.branchesError.set(true),
      });
    }
    if (this.locationState() !== 'idle') return;
    if (!('geolocation' in navigator)) {
      this.locationState.set('unavailable');
      return;
    }
    this.locationState.set('locating');
    // Blocked, slow or failed lookups all fall back to the unsorted list; signup never waits on this.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.location.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.locationState.set('found');
      },
      () => this.locationState.set('unavailable'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
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

function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
