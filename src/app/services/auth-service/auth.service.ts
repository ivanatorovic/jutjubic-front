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


  private readonly NEW_USER_EMAIL_KEY = 'newly_registered_email';

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest) {
    return this.http.post(`${API_URL}/register`, data, { responseType: 'text' });
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/login`, data);
  }

 
  markJustRegistered(email: string) {
    sessionStorage.setItem(this.NEW_USER_EMAIL_KEY, email.trim().toLowerCase());
  }

  wasJustRegistered(email: string): boolean {
    return sessionStorage.getItem(this.NEW_USER_EMAIL_KEY) === email.trim().toLowerCase();
  }

  clearJustRegistered() {
    sessionStorage.removeItem(this.NEW_USER_EMAIL_KEY);
  }


  private clearTokenEverywhere() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.EXPIRES_AT_KEY);
  }

 
  saveToken(token: string, expiresInSeconds: number, persistAcrossRestart: boolean = true) {

    this.clearTokenEverywhere();

    const storage = persistAcrossRestart ? localStorage : sessionStorage;

    storage.setItem(this.TOKEN_KEY, token);

    const expiresAt = Date.now() + Number(expiresInSeconds ?? 3600) * 1000;
    storage.setItem(this.EXPIRES_AT_KEY, String(expiresAt));
  }

  private getStorageThatHasToken(): Storage | null {
    if (localStorage.getItem(this.TOKEN_KEY)) return localStorage;
    if (sessionStorage.getItem(this.TOKEN_KEY)) return sessionStorage;
    return null;
  }

  getToken(): string | null {
  
    const token = localStorage.getItem(this.TOKEN_KEY) ?? sessionStorage.getItem(this.TOKEN_KEY);
    if (!token) return null;

    
    if (this.isTokenExpired()) {
      this.logout();
      return null;
    }

    return token;
  }

  isTokenExpired(): boolean {
    const storage = this.getStorageThatHasToken();
    if (!storage) return true;

    const exp = storage.getItem(this.EXPIRES_AT_KEY);
    if (!exp) return true;

    return Date.now() >= Number(exp);
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); 
  }

  logout() {
    this.clearTokenEverywhere();
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


  extractToken(res: LoginResponse): string | null {
    return res?.accessToken ?? res?.jwt ?? res?.token ?? null;
  }

  extractExpiresIn(res: LoginResponse): number {
    return Number(res?.expiresIn ?? res?.expires_in ?? res?.expires ?? 3600);
  }
}
