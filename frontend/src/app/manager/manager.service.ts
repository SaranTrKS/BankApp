import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerSummary } from './models';

const API_BASE = 'http://127.0.0.1:8000';

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private http = inject(HttpClient);

  getCustomers(): Observable<CustomerSummary[]> {
    return this.http.get<CustomerSummary[]>(`${API_BASE}/manager/customers`);
  }
}
