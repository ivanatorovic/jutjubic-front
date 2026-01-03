import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Video, VideoService } from '../../services/video-service/video';
import { UploadProgressService, UploadState } from '../../services/upload-progress.service';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
     private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserIdFromToken();
     this.uploadProgress.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => {
        this.uploadState = s;

        // kad završi upload, osveži listu videa
        if (s.status === 'done') {
          this.load();
          // skloni banner posle par sekundi (opciono)
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

  openWatch(id: number) {
    this.router.navigate(['/watch', id]);
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

  openUser(userId?: number, ev?: Event) {
    ev?.stopPropagation(); // ⛔ ne otvaraj watch
    if (!userId) return;
    this.router.navigate(['/user-profile', userId]);
  }

    isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/videos']);
  }
}
