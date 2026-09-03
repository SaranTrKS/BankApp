import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoanApplicationPayload, LoanApplicationResponse } from './models';

const API_BASE = 'http://127.0.0.1:8000';

@Injectable({ providedIn: 'root' })
export class LoanApplicationService {
  private http = inject(HttpClient);

  submit(payload: LoanApplicationPayload): Observable<LoanApplicationResponse> {
    return this.http.post<LoanApplicationResponse>(`${API_BASE}/loan-applications`, payload);
  }
}
