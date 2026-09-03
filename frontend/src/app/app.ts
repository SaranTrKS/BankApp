import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DepositSchemesPage } from './deposit-schemes/deposit-schemes-page/deposit-schemes-page';

@Component({
  imports: [RouterOutlet, DepositSchemesPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
