import { Routes } from '@angular/router';
import { managerGuard } from './auth/manager.guard';
import { HomePage } from './home-page/home-page';
import { ManagerDashboard } from './manager/manager-dashboard/manager-dashboard';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'manager', component: ManagerDashboard, canActivate: [managerGuard] },
  // Login-free touchscreen mode for the Head Office kiosk; lazy-loaded so the main site doesn't carry it.
  {
    path: 'kiosk',
    title: 'DCCB-VZM Kiosk',
    loadComponent: () => import('./kiosk/kiosk-page/kiosk-page').then((m) => m.KioskPage),
  },
  { path: '**', redirectTo: '' },
];
