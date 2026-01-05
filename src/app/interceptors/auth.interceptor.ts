import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // ✅ auth endpoints - ne diraj ni token ni auto-logout
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

        // ✅ Auto logout samo za NE-auth pozive
        if (!isAuthEndpoint && err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/videos']);
        }

        return throwError(() => err);
      })
    );
  }
}
