import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE = environment.apiBase;

export type InterestType = 'deposit' | 'loan' | 'general';

/** What the visitor was looking at when they asked for a call back. */
export interface CallbackInterest {
  type: InterestType;
  ref?: string | null;
  label?: string | null;
  amount?: number | null;
}

export interface CallbackRequestPayload {
  full_name: string;
  mobile: string;
  interest_type: InterestType;
  interest_ref: string | null;
  interest_label: string | null;
  amount: number | null;
  branch_code: number;
  consent: boolean;
  /** Honeypot — always empty from the real form. */
  website: string;
}

@Injectable({ providedIn: 'root' })
export class CallbackService {
  private http = inject(HttpClient);

  submit(payload: CallbackRequestPayload): Observable<unknown> {
    return this.http.post(`${API_BASE}/callback-requests`, payload);
  }
}
