import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
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

  constructor(private auth: AuthService, private router: Router) {}

  ngOnDestroy(): void {
    if (this.lockTimer) clearInterval(this.lockTimer);
  }

  private startLock(seconds: number) {
    this.locked = true;
    this.lockSeconds = seconds;

    if (this.lockTimer) clearInterval(this.lockTimer);

    this.lockTimer = setInterval(() => {
      this.lockSeconds--;
      if (this.lockSeconds <= 0) {
        clearInterval(this.lockTimer);
        this.locked = false;
        // ostavi error ili ga obriši kako želiš:
        // this.error = '';
      }
    }, 1000);
  }

  private extractMessage(err: any): string {
    // Spring ResponseStatusException često dođe kao JSON {message: "..."}
    if (err?.error?.message) return err.error.message;

    // nekad dođe plain string
    if (typeof err?.error === 'string' && err.error.trim()) return err.error;

    // fallback
    return '';
  }

  login() {
    if (this.loading || this.locked) return;

    this.error = '';
    this.success = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Morate uneti email i lozinku.';
      return;
    }

    this.loading = true;

    this.auth.login({ email: this.email.trim(), password: this.password }).pipe(
      finalize(() => (this.loading = false))
    ).subscribe({
      next: (res) => {
        const token = res?.accessToken;
        const expiresIn = res?.expiresIn;

        if (!token) {
          this.error = 'Prijava je uspela, ali token nije stigao sa backenda.';
          return;
        }

        this.auth.saveToken(token, Number(expiresIn ?? 3600));
        this.router.navigate(['/videos']);
      },

      error: (err) => {
        // ✅ 429 – rate limit
        if (err?.status === 429) {
          this.startLock(60);
          this.error = 'Previše zahteva. Sačekajte minut.';
          return;
        }

        // ✅ 0 – server down / CORS / network
        if (err?.status === 0) {
          this.error = 'Ne mogu da se povežem na server. Proverite da li backend radi.';
          return;
        }

        // ✅ 400 – tvoj backend šalje za pogrešne kredencijale + disabled
        if (err?.status === 400) {
          const msg = this.extractMessage(err).toLowerCase();

          if (msg.includes('nije aktiviran')) {
            this.error = 'Nalog nije aktiviran. Proverite mejl i kliknite na aktivacioni link.';
            return;
          }

          // pogrešan login
          this.error = 'Ne postoji korisnik sa datim emailom i lozinkom.';
          return;
        }

        // fallback
        this.error = this.extractMessage(err) || 'Greška pri prijavi.';
      }
    });
  }
}
