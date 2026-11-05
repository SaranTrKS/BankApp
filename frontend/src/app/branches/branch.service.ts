import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { Branch } from './models';

const API_BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class BranchService {
  private http = inject(HttpClient);

  // The list never changes while the app is open, so fetch it once and share it.
  private branches$ = this.http.get<Branch[]>(`${API_BASE}/branches`).pipe(shareReplay(1));

  getBranches(): Observable<Branch[]> {
    return this.branches$;
  }
}
