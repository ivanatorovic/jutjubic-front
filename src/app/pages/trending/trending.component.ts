import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { VideoService } from '../../services/video-service/video';
import { AuthService } from '../../services/auth-service/auth.service';
import { LocalTrendingService, VideoDto } from '../../services/local-trending-service/local-trending.service';

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

  currentLat?: number;
  currentLon?: number;

  private cleaningUrl = false; // ✅ da izbegnemo petlju kad brišemo parametre

  constructor(
    public videoService: VideoService,
    private trendingService: LocalTrendingService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserIdFromToken();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((p) => {
        // ne radimo async u subscribe; pozivamo helper
        this.handleParams(p);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async handleParams(p: any): Promise<void> {
    const urlLat = p['lat'] ? Number(p['lat']) : undefined;
    const urlLon = p['lon'] ? Number(p['lon']) : undefined;

    // 1) ako je geo permission DENIED i u URL-u stoje koordinate → obriši ih
    const perm = await this.trendingService.getGeoPermissionState();

    if (!this.cleaningUrl && perm === 'denied' && (urlLat != null || urlLon != null)) {
      this.cleaningUrl = true;

      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { lat: null, lon: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });

      this.cleaningUrl = false;
      return; // posle navigate će doći novi queryParams event bez lat/lon
    }

    // 2) koristi koordinate iz URL-a (ako postoje), u suprotnom undefined -> backend fallback
    this.currentLat = urlLat;
    this.currentLon = urlLon;

    this.loadTrending(this.currentLat, this.currentLon);
   
  }

  onRadiusChange(): void {
    this.loadTrending(this.currentLat, this.currentLon);
  }

  loadTrending(lat?: number, lon?: number): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.trendingService
      .getLocalTrending(this.radiusKm, lat, lon)
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
  }

  // ✅ dugme “Osveži lokaciju” (user gesture) – ako hoćeš u UI
  async refreshLocation(): Promise<void> {
    const loc = await this.trendingService.getBrowserLocation(15000);

    if (loc) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { lat: loc.lat, lon: loc.lon },
        queryParamsHandling: 'merge',
      });
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { lat: null, lon: null },
        queryParamsHandling: 'merge',
      });
    }
  }

  openWatch(id: number) {
    this.router.navigate(['/watch', id]);
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
