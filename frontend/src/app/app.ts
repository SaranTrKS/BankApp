import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DepositSchemesPage } from './deposit-schemes/deposit-schemes-page/deposit-schemes-page';
import { LoanApplicationPage } from './loan-application/loan-application-page/loan-application-page';

@Component({
  imports: [RouterOutlet, DepositSchemesPage, LoanApplicationPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
