import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { VideoService } from '../../services/video-service/video';
import { AuthService } from '../../services/auth-service/auth.service';
import {
  LocalTrendingService,
  VideoDto,
} from '../../services/local-trending-service/local-trending.service';

@Component({
  selector: 'app-trending',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './trending.component.html',
  styleUrls: ['./trending.component.scss'],
})
export class TrendingComponent implements OnInit, OnDestroy {
  trending: VideoDto[] = [];
  loading = false;
  error = '';

  radiusKm = 10;

  radiusOptions: number[] = [1, 3, 5, 10, 20, 50, 100];

  private destroy$ = new Subject<void>();
  currentUserId: number | null = null;

  constructor(
    public videoService: VideoService,
    private trendingService: LocalTrendingService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserIdFromToken();
    this.loadTrending(); // ⬅️ samo ovo
  }

  onRadiusChange(): void {
    this.loadTrending();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadTrending(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      const loc = await this.trendingService.getBrowserLocation();
      this.trendingService
        .getLocalTrending(this.radiusKm, loc?.lat ?? undefined, loc?.lon ?? undefined)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.trending = data ?? [];
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.error = `Greška (${err?.status ?? ''})`;
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
    } catch {
      this.error = 'Greška pri dobavljanju lokacije';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openWatch(id: number) {
    this.router.navigate(['/watch', id]);
  }

  back() {
    this.router.navigate(['/videos']);
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/videos']);
  }

  openUser(userId: number | undefined | null, ev: Event) {
    ev.stopPropagation();
    if (userId == null) return;
    this.router.navigate(['/user-profile', userId]);
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';

    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(min / 60);
    const days = Math.floor(h / 24);

    if (min < 1) return 'upravo sada';
    if (min < 60) return `pre ${min} min`;
    if (h < 24) return `pre ${h} h`;
    if (days < 7) return `pre ${days} dana`;
    return d.toLocaleDateString();
  }
}
