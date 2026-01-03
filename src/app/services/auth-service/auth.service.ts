import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/api/auth';

export type RegisterRequest = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  address: string;
  password: string;
  confirmPassword: string
};

export type LoginRequest = {
  email: string;
  password: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${API_URL}/register`, data);
  }

  login(data: LoginRequest): Observable<any> {
    return this.http.post(`${API_URL}/login`, data);
  }

  saveToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  getUserIdFromToken(): number | null {
  const token = this.getToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    // probaj više naziva jer backendovi često različito zovu claim
    const id = json.id ?? json.userId ?? json.subId ?? null;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

}
