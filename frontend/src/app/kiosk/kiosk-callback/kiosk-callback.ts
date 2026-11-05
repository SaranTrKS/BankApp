import { Component, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { formatInr } from '../../deposit-schemes/calculators';
import { CallbackInterest, CallbackService } from '../callback.service';
import { KIOSK_BRANCH_CODE, THANK_YOU_MS } from '../kiosk.config';
import { KIOSK_TEXT } from '../kiosk-text';
import { LetterKeyboard, applyLetterKey } from '../letter-keyboard/letter-keyboard';
import { NumberPad, applyPadKey } from '../number-pad/number-pad';

type Field = 'name' | 'mobile';

const GENERAL_CHOICES: CallbackInterest[] = [
  { type: 'deposit', label: 'Deposits' },
  { type: 'loan', label: 'Loans' },
  { type: 'general', label: 'Something else' },
];

/**
 * "Please call me back" form for visitors who don't sign in. Name and mobile are
 * typed on on-screen keyboards. The mobile number is not verified — managers see
 * it labelled as such.
 */
@Component({
  selector: 'app-kiosk-callback',
  standalone: true,
  imports: [LetterKeyboard, NumberPad],
  templateUrl: './kiosk-callback.html',
  styleUrl: './kiosk-callback.scss',
})
export class KioskCallback implements OnDestroy {
  /** What they were looking at; null when they came straight from the home screen. */
  interest = input<CallbackInterest | null>(null);
  done = output<void>();

  private callbackService = inject(CallbackService);

  readonly t = KIOSK_TEXT;
  readonly generalChoices = GENERAL_CHOICES;
  formatInr = formatInr;

  name = signal('');
  mobile = signal('');
  consent = signal(false);
  chosenInterest = signal<CallbackInterest | null>(null);
  activeField = signal<Field>('name');
  /** Honeypot: a hidden field people never see; anything typed here marks a bot. */
  website = signal('');

  submitting = signal(false);
  error = signal<string | null>(null);
  sent = signal(false);

  private thankYouTimer?: ReturnType<typeof setTimeout>;

  effectiveInterest = computed(() => this.interest() ?? this.chosenInterest());
  nameValid = computed(() => this.name().trim().replace(/[^a-z]/gi, '').length >= 2);
  mobileValid = computed(() => /^[6-9]\d{9}$/.test(this.mobile()));
  canSend = computed(
    () => this.nameValid() && this.mobileValid() && this.consent() && this.effectiveInterest() !== null && !this.submitting()
  );

  // Each handler builds on the latest signal value (fast taps can't use a stale one)
  // and clears the last error, since the visitor is fixing something.
  onLetter(key: string): void {
    this.name.update((name) => applyLetterKey(name, key, 60));
    this.error.set(null);
  }

  onDigit(key: string): void {
    this.mobile.update((mobile) => applyPadKey(mobile, key, 10));
    this.error.set(null);
  }

  toggleConsent(): void {
    this.consent.update((v) => !v);
    this.error.set(null);
  }

  chooseInterest(choice: CallbackInterest): void {
    this.chosenInterest.set(choice);
    this.error.set(null);
  }

  interestSummary(interest: CallbackInterest): string {
    const amount = interest.amount ? ` · ${formatInr(interest.amount)}` : '';
    return `${interest.label ?? 'General enquiry'}${amount}`;
  }

  /** Mobile shown as 98765 43210 while typing. */
  formattedMobile = computed(() => {
    const m = this.mobile();
    return m.length > 5 ? `${m.slice(0, 5)} ${m.slice(5)}` : m;
  });

  submit(): void {
    if (!this.canSend()) {
      this.error.set(this.firstProblem());
      return;
    }
    const interest = this.effectiveInterest()!;
    this.error.set(null);
    this.submitting.set(true);
    this.callbackService
      .submit({
        full_name: this.name().trim(),
        mobile: this.mobile(),
        interest_type: interest.type,
        interest_ref: interest.ref ?? null,
        interest_label: interest.label ?? null,
        amount: interest.amount ?? null,
        branch_code: KIOSK_BRANCH_CODE,
        consent: this.consent(),
        website: this.website(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.set(true);
          this.thankYouTimer = setTimeout(() => this.done.emit(), THANK_YOU_MS);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(
            err?.status === 0
              ? 'Could not reach the bank right now. Please ask at the counter.'
              : err?.error?.detail && typeof err.error.detail === 'string'
                ? err.error.detail
                : 'Something went wrong. Please check your details and try again.'
          );
        },
      });
  }

  private firstProblem(): string | null {
    if (this.effectiveInterest() === null) return 'Please choose what you would like to talk about.';
    if (!this.nameValid()) return 'Please type your name.';
    if (!this.mobileValid()) return 'Please enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
    if (!this.consent()) return 'Please tick the box so we are allowed to call you.';
    return null;
  }

  ngOnDestroy(): void {
    clearTimeout(this.thankYouTimer);
  }
}
