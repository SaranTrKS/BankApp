import { Component, signal } from '@angular/core';
import { DEPOSIT_SCHEMES } from '../deposit-schemes.data';
import { SchemeCard } from '../scheme-card/scheme-card';

@Component({
  selector: 'app-deposit-schemes-page',
  standalone: true,
  imports: [SchemeCard],
  templateUrl: './deposit-schemes-page.html',
  styleUrl: './deposit-schemes-page.scss',
})
export class DepositSchemesPage {
  schemes = DEPOSIT_SCHEMES;
  isOpen = signal(true);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }
}
