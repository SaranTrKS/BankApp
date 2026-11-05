import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { formatInr } from '../../deposit-schemes/calculators';
import { ManagerService } from '../manager.service';
import { CallbackRequestRow, CallbackStatus } from '../models';

type StatusFilter = CallbackStatus | 'all';

/** Call-back requests left at the kiosk, for the manager dashboard's second tab. */
@Component({
  selector: 'app-callback-requests',
  standalone: true,
  templateUrl: './callback-requests.html',
  styleUrl: './callback-requests.scss',
})
export class CallbackRequests implements OnInit {
  isSuperManager = input(false);
  /** Lets the dashboard show "Call-back requests (3 new)" on the tab. */
  newCountChange = output<number>();

  private managerService = inject(ManagerService);

  loading = signal(true);
  errorMessage = signal<string | null>(null);
  rows = signal<CallbackRequestRow[]>([]);
  statusFilter = signal<StatusFilter>('new');
  updatingId = signal<number | null>(null);

  visibleRows = computed(() => {
    const filter = this.statusFilter();
    return filter === 'all' ? this.rows() : this.rows().filter((r) => r.status === filter);
  });
  newCount = computed(() => this.rows().filter((r) => r.status === 'new').length);
  columnCount = computed(() => (this.isSuperManager() ? 8 : 7));

  readonly filters: { value: StatusFilter; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'all', label: 'All' },
  ];

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.managerService.getCallbackRequests().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
        this.newCountChange.emit(this.newCount());
      },
      error: () => {
        this.errorMessage.set('Could not load call-back requests.');
        this.loading.set(false);
      },
    });
  }

  setStatus(row: CallbackRequestRow, status: CallbackStatus): void {
    this.updatingId.set(row.id);
    this.managerService.updateCallbackStatus(row.id, status).subscribe({
      next: (updated) => {
        this.rows.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
        this.updatingId.set(null);
        this.newCountChange.emit(this.newCount());
      },
      error: () => {
        this.updatingId.set(null);
        this.errorMessage.set('Could not update that request. Please try again.');
      },
    });
  }

  countFor(filter: StatusFilter): number {
    return filter === 'all' ? this.rows().length : this.rows().filter((r) => r.status === filter).length;
  }

  interestText(row: CallbackRequestRow): string {
    const kind = row.interest_type === 'deposit' ? 'Deposit' : row.interest_type === 'loan' ? 'Loan' : 'General';
    return row.interest_label && row.interest_label !== 'Deposits' && row.interest_label !== 'Loans'
      ? `${kind}: ${row.interest_label}`
      : kind;
  }

  amountText(row: CallbackRequestRow): string {
    return row.amount ? formatInr(row.amount) : '—';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    // Stored as naive UTC by the backend.
    const utc = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
    return new Date(utc).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
