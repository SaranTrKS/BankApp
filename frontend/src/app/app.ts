import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountPage } from './auth/account-page/account-page';
import { AuthService } from './auth/auth.service';
import { DepositSchemesPage } from './deposit-schemes/deposit-schemes-page/deposit-schemes-page';
import { LoanApplicationPage } from './loan-application/loan-application-page/loan-application-page';
import { ManagerDashboard } from './manager/manager-dashboard/manager-dashboard';

@Component({
  imports: [RouterOutlet, AccountPage, ManagerDashboard, DepositSchemesPage, LoanApplicationPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private auth = inject(AuthService);
  isManager = this.auth.isManager;
}
