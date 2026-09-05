import { Routes } from '@angular/router';
import { managerGuard } from './auth/manager.guard';
import { HomePage } from './home-page/home-page';
import { ManagerDashboard } from './manager/manager-dashboard/manager-dashboard';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'manager', component: ManagerDashboard, canActivate: [managerGuard] },
  { path: '**', redirectTo: '' },
];
