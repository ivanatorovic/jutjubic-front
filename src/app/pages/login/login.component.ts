import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  email = '';
  password = '';

  error = '';
  success = '';
  loading = false;

  locked = false;
  lockSeconds = 0;
  private lockTimer: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    if (this.lockTimer) clearInterval(this.lockTimer);
  }

  private startLock(seconds: number) {
    this.locked = true;
    this.lockSeconds = seconds;

   
    this.cdr.detectChanges();

    if (this.lockTimer) clearInterval(this.lockTimer);

    this.lockTimer = setInterval(() => {
      this.lockSeconds--;

      
      this.cdr.detectChanges();

      if (this.lockSeconds <= 0) {
        clearInterval(this.lockTimer);
        this.lockTimer = null;
        this.locked = false;

      
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  private extractMessage(err: any): string {
    if (err?.error?.message) return err.error.message;

    if (typeof err?.error === 'string' && err.error.trim()) return err.error;


    return '';
  }

  login() {
    if (this.loading || this.locked) return;

    this.error = '';
    this.success = '';

    const emailTrimmed = this.email.trim();
    if (!emailTrimmed || !this.password.trim()) {
      this.error = 'Morate uneti email i lozinku.';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); 

    this.auth
      .login({ email: emailTrimmed, password: this.password })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges(); 
        })
      )
      .subscribe({
        next: (res) => {
         
          const token = this.auth.extractToken(res);
          const expiresIn = this.auth.extractExpiresIn(res);

          if (!token) {
            this.error = 'Prijava je uspela, ali token nije stigao sa backenda.';
            this.cdr.detectChanges();
            return;
          }

         
          const emailKey = emailTrimmed.toLowerCase();
          const isNewThisSession = this.auth.wasJustRegistered(emailKey);

         
          this.auth.saveToken(token, expiresIn, !isNewThisSession);

          
          if (isNewThisSession) {
            this.auth.clearJustRegistered();
          }

          this.cdr.detectChanges();
          this.router.navigate(['/videos']);
        },

        error: (err) => {
          if (err?.status === 429) {
            this.startLock(60);
            this.error = 'Previše zahteva. Sačekajte minut.';
            this.cdr.detectChanges();
            return;
          }

          if (err?.status === 0) {
            this.error = 'Ne mogu da se povežem na server. Proverite da li backend radi.';
            this.cdr.detectChanges();
            return;
          }

          if (err?.status === 401) {
            this.error = this.extractMessage(err) || 'Ne postoji korisnik sa ovim podacima.';
            this.cdr.detectChanges();
            return;
          }

          if (err?.status === 400) {
            const msg = (this.extractMessage(err) || '').toLowerCase();

            if (msg.includes('nije aktiviran')) {
              this.error = 'Nalog nije aktiviran. Proverite mejl i kliknite na aktivacioni link.';
              this.cdr.detectChanges();
              return;
            }

            this.error = this.extractMessage(err) || 'Neispravan zahtev.';
            this.cdr.detectChanges();
            return;
          }

          this.error = this.extractMessage(err) || 'Greška pri prijavi.';
          this.cdr.detectChanges();
        }
      });
  }
}
