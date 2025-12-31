import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserPublicDto, UserService } from '../../services/user-service/user';

// ✅ koristi tvoj postojeći VideoService (on ima thumbnailUrl kao na /videos)
import { Video, VideoService } from '../../services/video-service/video';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';

  user: UserPublicDto | null = null;

  // ✅ videi state
  videosLoading = false;
  videosError = '';
  videos: Video[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public videoService: VideoService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const raw = pm.get('id');
      const id = Number(raw);

      if (!id) {
        this.error = 'Neispravan ID korisnika';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      // reset
      this.loading = true;
      this.error = '';
      this.user = null;

      this.videosLoading = false;
      this.videosError = '';
      this.videos = [];

      this.cdr.detectChanges();

      this.userService.getById(id).subscribe({
        next: (u) => {
          this.user = u;
          this.loading = false;
          this.cdr.detectChanges();

          this.loadUserVideos(id);
        },
        error: (err) => {
          this.error = `Ne mogu da učitam profil (${err?.status ?? '?'})`;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    });
  }

  private loadUserVideos(userId: number) {
    this.videosLoading = true;
    this.videosError = '';
    this.videos = [];
    this.cdr.detectChanges();

    this.userService.getUserVideos(userId).subscribe({
      next: (list) => {
        this.videos = list ?? [];
        this.videosLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.videosError = `Ne mogu da učitam videe (${err?.status ?? '?'})`;
        this.videosLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openWatch(id: number) {
    this.router.navigate(['/watch', id]);
  }

  // (kopija logike koju već koristiš)
  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
