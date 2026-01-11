import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service/auth.service';
import { finalize, timeout } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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

  constructor(private auth: AuthService, private cdr: ChangeDetectorRef, private router: Router,) {}

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

   
    if (!this.allFieldsFilled()) {
      this.error = 'Morate uneti sve podatke.';
      return;
    }

 
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
       
        this.auth.markJustRegistered(this.form.email); 
        this.success = 'Proverite mejl i kliknite na link u poruci.';
        this.cdr.detectChanges();
        setTimeout(() => {
        this.router.navigate(['/login']);
    },  3500);

      },
      error: (err) => {
        this.loading = false;

        
        const msg =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          '';

     
        if 
          (msg.toLowerCase().includes('email je već zauzet') ){
              this.error = 'Postoji već korisnik sa ovakvim email-om.';
            this.cdr.detectChanges();
            return;
          }
        else if
          (msg.toLowerCase().includes('korisničko ime je već zauzeto'))
           this.error = 'Postoji već korisnik sa ovakvim username-om.';
          this.cdr.detectChanges();
          return;
        

      
        this.error = msg || 'Greška pri registraciji. Pokušajte ponovo.';
         this.cdr.detectChanges();
      }
    });
  }
}
