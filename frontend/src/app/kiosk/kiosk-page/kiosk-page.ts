import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CallbackInterest } from '../callback.service';
import { KioskBranches } from '../kiosk-branches/kiosk-branches';
import { KioskCallback } from '../kiosk-callback/kiosk-callback';
import { KioskChildren } from '../kiosk-children/kiosk-children';
import { KioskAbout } from '../kiosk-about/kiosk-about';
import { KioskDeposits } from '../kiosk-deposits/kiosk-deposits';
import { KioskLoans } from '../kiosk-loans/kiosk-loans';
import { KioskPhone } from '../kiosk-phone/kiosk-phone';
import { IDLE_RESET_MS, IDLE_WARNING_MS } from '../kiosk.config';
import { Bilingual, KIOSK_TEXT } from '../kiosk-text';

type View = 'attract' | 'home' | 'deposits' | 'loans' | 'children' | 'branches' | 'callback' | 'phone' | 'about';

interface HomeTile {
  view: View;
  icon: string;
  text: Bilingual;
  hint: string;
}

const HOME_TILES: HomeTile[] = [
  { view: 'deposits', icon: '💰', text: KIOSK_TEXT.deposits, hint: 'See how your money grows' },
  { view: 'loans', icon: '🏦', text: KIOSK_TEXT.loans, hint: 'Farm, gold, home & more' },
  { view: 'children', icon: '👶', text: KIOSK_TEXT.children, hint: 'Bala Bhavishyath Nidhi' },
  { view: 'branches', icon: '📍', text: KIOSK_TEXT.branches, hint: '25 branches & directions' },
];

/**
 * Login-free kiosk for the Head Office touchscreen (route /kiosk). Every screen lives in
 * this one component's view switch, so going back to the welcome screen destroys the
 * screens and wipes anything the last visitor typed.
 */
@Component({
  selector: 'app-kiosk-page',
  standalone: true,
  imports: [KioskDeposits, KioskChildren, KioskBranches, KioskCallback, KioskLoans, KioskPhone, KioskAbout],
  templateUrl: './kiosk-page.html',
  styleUrl: './kiosk-page.scss',
})
export class KioskPage implements OnInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly t = KIOSK_TEXT;
  readonly tiles = HOME_TILES;

  view = signal<View>('attract');
  callbackInterest = signal<CallbackInterest | null>(null);
  now = signal(new Date());
  idleWarning = signal(false);
  secondsLeft = signal(0);

  private lastActivity = Date.now();
  private ticker?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.ticker = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
  }

  // Any touch counts as activity and dismisses the "still there?" prompt.
  @HostListener('document:pointerdown')
  @HostListener('document:keydown')
  onActivity(): void {
    this.lastActivity = Date.now();
    this.idleWarning.set(false);
  }

  // Long-press on a touchscreen opens the context menu; never useful on a kiosk.
  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: Event): void {
    event.preventDefault();
  }

  private tick(): void {
    this.now.set(new Date());
    if (this.view() === 'attract') return;
    const idle = Date.now() - this.lastActivity;
    if (idle >= IDLE_RESET_MS) {
      this.reset();
    } else if (idle >= IDLE_WARNING_MS) {
      this.idleWarning.set(true);
      this.secondsLeft.set(Math.ceil((IDLE_RESET_MS - idle) / 1000));
    }
  }

  go(view: View): void {
    this.view.set(view);
    this.host.nativeElement.scrollTop = 0;
  }

  openCallback(interest: CallbackInterest | null): void {
    this.callbackInterest.set(interest);
    this.go('callback');
  }

  /** Back to the welcome screen, forgetting everything the last visitor did. */
  reset(): void {
    this.idleWarning.set(false);
    this.callbackInterest.set(null);
    this.go('attract');
  }

  timeText(): string {
    return this.now().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  dateText(): string {
    return this.now().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
