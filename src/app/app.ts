import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth-service/auth.service';

@Component({
  selector: 'app-root',
  
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('jutjubic-front');

    constructor(private auth: AuthService) {}

  ngOnInit(): void {
    // ✅ ostani ulogovan posle reload-a ako token postoji i nije istekao
    if (!this.auth.isLoggedIn()) {
      // token ne postoji ili je istekao -> očisti storage
      this.auth.logout();
      // ne moraš ništa da redirectuješ ovde
    }
  }
}
