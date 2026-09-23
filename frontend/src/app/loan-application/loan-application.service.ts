import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoanApplicationPayload, LoanApplicationResponse } from './models';

const API_BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class LoanApplicationService {
  private http = inject(HttpClient);

  submit(payload: LoanApplicationPayload): Observable<LoanApplicationResponse> {
    return this.http.post<LoanApplicationResponse>(`${API_BASE}/loan-applications`, payload);
  }

  listAll(): Observable<LoanApplicationResponse[]> {
    return this.http.get<LoanApplicationResponse[]>(`${API_BASE}/loan-applications`);
  }
}
