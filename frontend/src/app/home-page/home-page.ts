import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CompleteProfile } from '../auth/complete-profile/complete-profile';
import { AuthService } from '../auth/auth.service';
import { DepositSchemesPage } from '../deposit-schemes/deposit-schemes-page/deposit-schemes-page';
import { LoanApplicationPage } from '../loan-application/loan-application-page/loan-application-page';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [DepositSchemesPage, LoanApplicationPage, CompleteProfile],
  templateUrl: './home-page.html',
})
export class HomePage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  needsProfileCompletion = this.auth.needsProfileCompletion;

  async ngOnInit(): Promise<void> {
    await this.auth.whenReady();
    if (this.auth.isManager()) {
      this.router.navigateByUrl('/manager');
    }
  }
}
