import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  verifyingSession = this.auth.verifying;
}
