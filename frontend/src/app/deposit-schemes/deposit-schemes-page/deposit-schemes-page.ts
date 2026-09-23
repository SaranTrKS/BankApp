import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BalaBhavishyathCard } from '../bala-bhavishyath-card/bala-bhavishyath-card';
import { DEPOSIT_SCHEMES } from '../deposit-schemes.data';
import { SchemeCard } from '../scheme-card/scheme-card';

const DEFAULT_DEPOSIT_AMOUNT = 100000;
const MIN_DEPOSIT_AMOUNT = 500;

@Component({
  selector: 'app-deposit-schemes-page',
  standalone: true,
  imports: [FormsModule, SchemeCard, BalaBhavishyathCard],
  templateUrl: './deposit-schemes-page.html',
  styleUrl: './deposit-schemes-page.scss',
})
export class DepositSchemesPage {
  schemes = DEPOSIT_SCHEMES;
  isOpen = signal(true);

  minDepositAmount = MIN_DEPOSIT_AMOUNT;
  depositAmount = signal(DEFAULT_DEPOSIT_AMOUNT);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  onDepositAmountChange(value: number): void {
    this.depositAmount.set(Math.max(MIN_DEPOSIT_AMOUNT, Math.round(value) || MIN_DEPOSIT_AMOUNT));
  }
}
