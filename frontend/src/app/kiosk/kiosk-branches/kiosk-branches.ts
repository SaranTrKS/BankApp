import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { BranchService } from '../../branches/branch.service';
import { distanceKm, googleMapsUrl } from '../../branches/distance';
import { Branch } from '../../branches/models';
import { KIOSK_BRANCH_CODE } from '../kiosk.config';
import { KIOSK_TEXT } from '../kiosk-text';
import { QrCode } from '../qr-code/qr-code';

interface BranchRow {
  branch: Branch;
  km: number;
  isHere: boolean;
}

/** All branches, nearest to this kiosk first. Directions are a QR code, never a link. */
@Component({
  selector: 'app-kiosk-branches',
  standalone: true,
  imports: [QrCode],
  template: `
    <h2 class="title">{{ t.branches.en }} <span class="te">· {{ t.branches.te }}</span></h2>
    <p class="sub">{{ rows().length }} branches. Nearest to this kiosk first — touch one for directions.</p>

    @if (error()) {
      <p class="error">Could not load the branch list right now. Please ask at the counter.</p>
    }

    <div class="list">
      @for (row of rows(); track row.branch.code; let i = $index) {
        <button type="button" class="branch" [style.animation-delay.ms]="i * 25" (click)="selected.set(row.branch)">
          <span class="branch__code">{{ row.branch.code }}</span>
          <span class="branch__name">{{ row.branch.name }}</span>
          <span class="branch__km">{{ row.isHere ? 'You are here' : row.km < 1 ? 'Same town' : '~' + formatKm(row.km) }}</span>
        </button>
      }
    </div>

    @if (selected(); as branch) {
      <div class="sheet" (click)="selected.set(null)">
        <div class="sheet__card" (click)="$event.stopPropagation()">
          <h3>{{ branch.name }} <small>({{ branch.code }})</small></h3>
          <div class="qr"><app-qr-code [data]="mapUrl(branch)"></app-qr-code></div>
          <p class="sheet__hint">📱 {{ t.scanToOpen.en }} — opens Google Maps<br /><span class="te">{{ t.scanToOpen.te }}</span></p>
          @if (branch.approx) {
            <p class="sheet__note">The map shows the town; the branch is nearby.</p>
          }
          <button type="button" class="close" (click)="selected.set(null)">Close</button>
        </div>
      </div>
    }
  `,
  styleUrl: './kiosk-branches.scss',
})
export class KioskBranches implements OnInit {
  private branchService = inject(BranchService);

  readonly t = KIOSK_TEXT;
  branches = signal<Branch[]>([]);
  error = signal(false);
  selected = signal<Branch | null>(null);

  rows = computed<BranchRow[]>(() => {
    const list = this.branches();
    const here = list.find((b) => b.code === KIOSK_BRANCH_CODE);
    return list
      .map((branch) => ({
        branch,
        km: here ? distanceKm(here, branch) : 0,
        isHere: branch.code === KIOSK_BRANCH_CODE,
      }))
      .sort((a, b) => (a.isHere ? -1 : b.isHere ? 1 : a.km - b.km));
  });

  ngOnInit(): void {
    this.branchService.getBranches().subscribe({
      next: (list) => this.branches.set(list),
      error: () => this.error.set(true),
    });
  }

  mapUrl(branch: Branch): string {
    return googleMapsUrl(branch);
  }

  formatKm(km: number): string {
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }
}
