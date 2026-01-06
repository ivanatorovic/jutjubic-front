import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth-service/auth.service';
import { ChangeDetectorRef } from '@angular/core';


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

  constructor(private auth: AuthService, private router: Router,   private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.lockTimer) clearInterval(this.lockTimer);
  }

private startLock(seconds: number) {
  this.locked = true;
  this.lockSeconds = seconds;

  // odmah osveži prikaz dugmeta
  this.cdr.detectChanges();

  if (this.lockTimer) clearInterval(this.lockTimer);

  this.lockTimer = setInterval(() => {
    this.lockSeconds--;

    // ✅ prikaz smanjivanja brojeva
    this.cdr.detectChanges();

    if (this.lockSeconds <= 0) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
      this.locked = false;

      // (opciono) obriši poruku o lock-u kad istekne
      // this.error = '';

      // ✅ vrati dugme "Uloguj se"
      this.cdr.detectChanges();
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
    this.cdr.detectChanges();
    return;
  }

  this.loading = true;
  this.cdr.detectChanges(); // ✅ odmah promeni dugme u "Prijavljivanje..."

  this.auth.login({ email: this.email.trim(), password: this.password }).pipe(
    finalize(() => {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ čim stigne odgovor, vrati dugme i osveži UI
    })
  ).subscribe({
    next: (res) => {
      const token = res?.accessToken;
      const expiresIn = res?.expiresIn;

      if (!token) {
        this.error = 'Prijava je uspela, ali token nije stigao sa backenda.';
        this.cdr.detectChanges();
        return;
      }

      this.auth.saveToken(token, Number(expiresIn ?? 3600));
      this.cdr.detectChanges();
      this.router.navigate(['/videos']);
    },

    error: (err) => {
      // ✅ 429 – rate limit
      if (err?.status === 429) {
        this.startLock(60);
        this.error = 'Previše zahteva. Sačekajte minut.';
        this.cdr.detectChanges();
        return;
      }

      // ✅ 0 – server down / CORS / network
      if (err?.status === 0) {
        this.error = 'Ne mogu da se povežem na server. Proverite da li backend radi.';
        this.cdr.detectChanges();
        return;
      }

      // ✅ 401 – pogrešan email/lozinka (sad backend vraća 401)
      if (err?.status === 401) {
        this.error = this.extractMessage(err) || 'Ne postoji korisnik sa ovim podacima.';
        this.cdr.detectChanges(); // ✅ poruka odmah nakon klika
        return;
      }

      // ✅ 400 – npr. nalog nije aktiviran
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

      // fallback
      this.error = this.extractMessage(err) || 'Greška pri prijavi.';
      this.cdr.detectChanges();
    }
  });
}

}
