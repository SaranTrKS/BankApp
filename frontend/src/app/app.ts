import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountPage } from './auth/account-page/account-page';

@Component({
  imports: [RouterOutlet, AccountPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
