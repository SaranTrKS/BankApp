import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { formatInr } from '../../deposit-schemes/calculators';
import { CustomerSummary } from '../models';
import { ManagerService } from '../manager.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
})
export class ManagerDashboard implements OnInit {
  private managerService = inject(ManagerService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  customers = signal<CustomerSummary[]>([]);
  expandedCustomerId = signal<number | null>(null);

  totalLoans = computed(() => this.customers().reduce((sum, c) => sum + c.loan_applications.length, 0));
  totalDeposits = computed(() => this.customers().reduce((sum, c) => sum + c.deposit_applications.length, 0));

  formatInr = formatInr;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.managerService.getCustomers().subscribe({
      next: (rows) => {
        this.customers.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load customer applications.');
        this.loading.set(false);
      },
    });
  }

  toggleExpanded(customerId: number): void {
    this.expandedCustomerId.update((current) => (current === customerId ? null : customerId));
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN');
  }
}
