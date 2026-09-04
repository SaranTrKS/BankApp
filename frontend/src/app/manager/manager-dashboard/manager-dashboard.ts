import { Component, inject, signal } from '@angular/core';
import { formatInr } from '../../deposit-schemes/calculators';
import { DepositApplicationResponse, DepositApplicationService } from '../../deposit-schemes/deposit-application.service';
import { LoanApplicationService } from '../../loan-application/loan-application.service';
import { LoanApplicationResponse } from '../../loan-application/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
})
export class ManagerDashboard {
  private loanService = inject(LoanApplicationService);
  private depositService = inject(DepositApplicationService);

  isOpen = signal(false);
  activeTab = signal<'loans' | 'deposits'>('loans');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loanApplications = signal<LoanApplicationResponse[]>([]);
  depositApplications = signal<DepositApplicationResponse[]>([]);

  toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.refresh();
    }
  }

  setTab(tab: 'loans' | 'deposits'): void {
    this.activeTab.set(tab);
  }

  formatInr = formatInr;

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN');
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.loanService.listAll().subscribe({
      next: (rows) => {
        this.loanApplications.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load loan applications.');
        this.loading.set(false);
      },
    });
    this.depositService.listAll().subscribe({
      next: (rows) => this.depositApplications.set(rows),
      error: () => this.errorMessage.set('Could not load deposit applications.'),
    });
  }
}
