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
  confirmPassword: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

// opcioni tip (nije obavezno)
export type LoginResponse = {
  jwt?: string;
  accessToken?: string;
  token?: string;
  expiresIn?: number;
  expires_in?: number;
  expires?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly EXPIRES_AT_KEY = 'access_expires_at';

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest) {
    return this.http.post(`${API_URL}/register`, data, { responseType: 'text' });
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/login`, data);
  }

  saveToken(token: string, expiresInSeconds: number) {
    localStorage.setItem(this.TOKEN_KEY, token);

    const expiresAt = Date.now() + Number(expiresInSeconds) * 1000;
    localStorage.setItem(this.EXPIRES_AT_KEY, String(expiresAt));
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const exp = localStorage.getItem(this.EXPIRES_AT_KEY);
    if (!exp) return true;
    return Date.now() >= Number(exp);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    if (this.isTokenExpired()) {
      this.logout();
      return false;
    }

    return true;
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
  }

  getUserIdFromToken(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

      const id = json.id ?? json.userId ?? json.subId ?? null;
      return id != null ? Number(id) : null;
    } catch {
      return null;
    }
  }
}
