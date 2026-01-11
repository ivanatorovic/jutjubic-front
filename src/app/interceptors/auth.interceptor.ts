import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
 
    const isAuthEndpoint =
      req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/register') ||
      req.url.includes('/api/auth/activate');

    const token = this.auth.getToken();

    const authReq =
      !isAuthEndpoint && token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (!isAuthEndpoint && err.status === 401) {
          const hasToken = !!this.auth.getToken();

        
          if (hasToken) {
            this.auth.logout();
            this.router.navigate(['/videos']); 
          }

        
        }

        return throwError(() => err);
      })
    );
  }
}
