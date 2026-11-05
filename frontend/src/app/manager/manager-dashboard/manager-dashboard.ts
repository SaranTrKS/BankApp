import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { BranchService } from '../../branches/branch.service';
import { Branch } from '../../branches/models';
import { formatInr } from '../../deposit-schemes/calculators';
import { CustomerSummary } from '../models';
import { ManagerService } from '../manager.service';

/** 'all', a branch code, or 'none' for customers who signed up before branches existed. */
type BranchFilter = 'all' | 'none' | number;

interface BranchFilterOption {
  value: BranchFilter;
  label: string;
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.scss',
})
export class ManagerDashboard implements OnInit {
  private managerService = inject(ManagerService);
  private branchService = inject(BranchService);
  private auth = inject(AuthService);

  // The backend already limits a branch manager to their own branch's customers;
  // the super manager gets everyone and narrows it down here with branchFilter.
  isSuperManager = this.auth.isSuperManager;
  currentUser = this.auth.currentUser;

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  customers = signal<CustomerSummary[]>([]);
  branches = signal<Branch[]>([]);
  branchFilter = signal<BranchFilter>('all');
  expandedCustomerId = signal<number | null>(null);

  visibleCustomers = computed(() => {
    const filter = this.branchFilter();
    if (filter === 'all') return this.customers();
    if (filter === 'none') return this.customers().filter((c) => c.branch_code === null);
    return this.customers().filter((c) => c.branch_code === filter);
  });

  totalLoans = computed(() => this.visibleCustomers().reduce((sum, c) => sum + c.loan_applications.length, 0));
  totalDeposits = computed(() => this.visibleCustomers().reduce((sum, c) => sum + c.deposit_applications.length, 0));
  applicantCount = computed(() => this.visibleCustomers().filter(hasApplied).length);

  /** Filter dropdown entries, each with that branch's customer/applicant counts. */
  filterOptions = computed<BranchFilterOption[]>(() => {
    const all = this.customers();
    const counts = (rows: CustomerSummary[]) => `${rows.length} customers, ${rows.filter(hasApplied).length} applied`;
    const options: BranchFilterOption[] = [{ value: 'all', label: `All branches — ${counts(all)}` }];
    for (const branch of this.branches()) {
      const rows = all.filter((c) => c.branch_code === branch.code);
      options.push({ value: branch.code, label: `${branch.name} (${branch.code}) — ${counts(rows)}` });
    }
    const unassigned = all.filter((c) => c.branch_code === null);
    if (unassigned.length) {
      options.push({ value: 'none', label: `No branch selected — ${counts(unassigned)}` });
    }
    return options;
  });

  columnCount = computed(() => (this.isSuperManager() ? 9 : 8));

  formatInr = formatInr;

  ngOnInit(): void {
    this.refresh();
    if (this.isSuperManager()) {
      this.branchService.getBranches().subscribe({ next: (list) => this.branches.set(list) });
    }
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

function hasApplied(c: CustomerSummary): boolean {
  return c.loan_applications.length > 0 || c.deposit_applications.length > 0;
}
