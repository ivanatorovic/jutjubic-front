import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';
import { finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form = {
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    address: '',
    password: '',
    confirmPassword: ''
  };

  error = '';
  success = '';
  loading = false;

  constructor(private auth: AuthService) {}

  private allFieldsFilled(): boolean {
    const f = this.form;
    return !!(
      f.email?.trim() &&
      f.username?.trim() &&
      f.firstName?.trim() &&
      f.lastName?.trim() &&
      f.address?.trim() &&
      f.password?.trim() &&
      f.confirmPassword?.trim()
    );
  }

  register() {
    this.error = '';
    this.success = '';

    // 1) prazna polja
    if (!this.allFieldsFilled()) {
      this.error = 'Morate uneti sve podatke.';
      return;
    }

    // 2) lozinke
    if (this.form.password !== this.form.confirmPassword) {
      this.error = 'Lozinke se ne poklapaju.';
      return;
    }

    this.loading = true;

    this.auth.register({
      email: this.form.email.trim(),
      username: this.form.username.trim(),
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      address: this.form.address.trim(),
      password: this.form.password,
      confirmPassword: this.form.confirmPassword
    }) 
  .subscribe({
      next: () => {
        // 3) uspešno — link poslat
        this.success = 'Proverite mejl i kliknite na link u poruci.';

      },
      error: (err) => {
        this.loading = false;

        // backend poruka (ResponseStatusException vrati message)
        const msg =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          '';

        // 4) postoji korisnik (email/username već zauzet)
        if (
          msg.toLowerCase().includes('email je već zauzet') ||
          msg.toLowerCase().includes('korisničko ime je već zauzeto') ||
          msg.toLowerCase().includes('email je vec zauzet') ||
          msg.toLowerCase().includes('korisnicko ime je vec zauzeto')
        ) {
          this.error = 'Postoji već korisnik sa ovakvim podacima.';
          return;
        }

        // fallback
        this.error = msg || 'Greška pri registraciji. Pokušajte ponovo.';
      }
    });
  }
}
