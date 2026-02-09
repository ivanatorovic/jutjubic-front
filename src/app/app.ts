import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth-service/auth.service';
import { WatchPartyGlobalListenerService } from './services/global-listener.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('jutjubic-front');

  constructor(
    private wpListener: WatchPartyGlobalListenerService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    // ✅ start global listener (subscribe jednom za celu app)
    this.wpListener.init();

    // ✅ očisti token ako je istekao / nevažeći
    if (!this.auth.isLoggedIn()) {
      this.auth.logout();
    }
  }
}
