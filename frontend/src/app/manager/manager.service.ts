import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CallbackRequestRow, CallbackStatus, CustomerSummary } from './models';

const API_BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private http = inject(HttpClient);

  getCustomers(): Observable<CustomerSummary[]> {
    return this.http.get<CustomerSummary[]>(`${API_BASE}/manager/customers`);
  }

  /** Kiosk call-back requests; the backend limits a branch manager to their own branch. */
  getCallbackRequests(): Observable<CallbackRequestRow[]> {
    return this.http.get<CallbackRequestRow[]>(`${API_BASE}/manager/callback-requests`);
  }

  updateCallbackStatus(id: number, status: CallbackStatus): Observable<CallbackRequestRow> {
    return this.http.patch<CallbackRequestRow>(`${API_BASE}/manager/callback-requests/${id}`, { status });
  }
}
