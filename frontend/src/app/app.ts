import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AccountPage } from './auth/account-page/account-page';
import { AuthService } from './auth/auth.service';

@Component({
  imports: [RouterOutlet, AccountPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private auth = inject(AuthService);
  private router = inject(Router);
  verifyingSession = this.auth.verifying;

  /** The kiosk is full-screen and login-free: no site header, no sign-in panel, no session wait. */
  isKiosk = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => isKioskUrl((e as NavigationEnd).urlAfterRedirects))
    ),
    { initialValue: isKioskUrl(window.location.pathname) }
  );
}

function isKioskUrl(url: string): boolean {
  return url === '/kiosk' || url.startsWith('/kiosk/') || url.startsWith('/kiosk?');
}
