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
    // ✅ UVEK izloguj korisnika pri pokretanju aplikacije
    this.auth.logout();
  }
}
