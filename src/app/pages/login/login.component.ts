import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';

  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.error = '';
    this.success = '';

    // mala validacija
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Morate uneti email i lozinku.';
      return;
    }

    this.loading = true;

    this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;

        const token = res?.accessToken || res?.token;
        if (!token) {
          this.error = 'Prijava je uspela, ali token nije stigao sa backenda.';
          return;
        }

        this.auth.saveToken(token);
        this.router.navigate(['/videos']); // ostaje na početnoj
      },
      error: (err) => {
        this.loading = false;

        const msg =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          '';

        // 5) nije aktivirao nalog
        if (
          msg.toLowerCase().includes('disabled') ||
          msg.toLowerCase().includes('not enabled') ||
          msg.toLowerCase().includes('nije aktiv') ||
          msg.toLowerCase().includes('not activated')
        ) {
          this.error =
            'Greška prilikom prijave, proverite mejl ili probajte opet da se registrujete.';
          return;
        }

        // default (pogrešan email/lozinka)
        this.error = 'Ne postoji korisnik sa datim emailom i lozinkom.';
      }
    });
  }
}
