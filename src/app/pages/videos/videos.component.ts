import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { Video, VideoService } from '../../services/video-service/video';
import { UploadProgressService, UploadState } from '../../services/upload-progress.service';
import { AuthService } from '../../services/auth-service/auth.service';
import { LocalTrendingService } from '../../services/local-trending-service/local-trending.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
})
export class VideosComponent implements OnInit, OnDestroy {
  videos: Video[] = [];
  loading = false;
  error = '';
  uploadState: UploadState = { status: 'idle' };

  private destroy$ = new Subject<void>();
  currentUserId: number | null = null;

  constructor(
    public videoService: VideoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private uploadProgress: UploadProgressService,
    private auth: AuthService,
    private trendingService: LocalTrendingService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserIdFromToken();

    this.uploadProgress.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => {
        this.uploadState = s;

        if (s.status === 'done') {
          this.load();
          setTimeout(() => this.uploadProgress.clear(), 3000);
        }

        this.cdr.detectChanges();
      });

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.videoService.getAll().subscribe({
      next: (data) => {
        this.videos = data ?? [];
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

  // ✅ Trending klik = user gesture -> browser popup za lokaciju
  async openTrending(): Promise<void> {
  // odmah otvori trending (fallback)
  await this.router.navigate(['/trending']);

  const loc = await this.trendingService.getBrowserLocation(10000);

  if (loc) {
    await this.router.navigate(['/trending'], {
      queryParams: { lat: loc.lat, lon: loc.lon },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}



  openWatch(id: number) {
    this.router.navigate(['/watch', id]);
  }

  openUser(userId?: number, ev?: Event) {
    ev?.stopPropagation();
    if (!userId) return;
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

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/videos']);
  }
}
