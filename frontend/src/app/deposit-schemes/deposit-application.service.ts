import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerType } from './models';

const API_BASE = 'http://127.0.0.1:8000';

export interface DepositApplicationPayload {
  scheme_id: string;
  scheme_name: string;
  customer_type: CustomerType;
  amount: number;
  tenure_days: number;
  projected_value: number;
}

export interface DepositApplicationResponse extends DepositApplicationPayload {
  id: number;
  username: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class DepositApplicationService {
  private http = inject(HttpClient);

  submit(payload: DepositApplicationPayload): Observable<DepositApplicationResponse> {
    return this.http.post<DepositApplicationResponse>(`${API_BASE}/deposit-applications`, payload);
  }

  listAll(): Observable<DepositApplicationResponse[]> {
    return this.http.get<DepositApplicationResponse[]>(`${API_BASE}/deposit-applications`);
  }
}
