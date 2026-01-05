import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommentPublicDto, Video, VideoService } from '../../services/video-service/video';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-watch',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss'],
})
export class WatchComponent implements OnInit, OnDestroy {
  error = '';

  id: number | null = null;
  src = '';

  video: Video | null = null;
  metaLoading = false;
  metaError = '';

  comments: CommentPublicDto[] = [];
  commentsLoading = false;
  commentsError = '';
  likedByMe = false;
  likeBusy = false;


  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public videoService: VideoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const id = Number(pm.get('id'));
      if (!id) {
        this.error = 'Neispravan ID videa';
        return;
      }

      this.error = '';
      this.id = id;
      this.src = this.videoService.streamUrl(id);

      this.loadMeta(id);
      this.loadComments(id);

      this.cdr.detectChanges();
    });
  }

  private loadMeta(id: number) {
    this.video = null;
    this.metaError = '';
    this.metaLoading = true;

    this.videoService.getById(id).subscribe({
      next: (v) => {
        this.video = v;
        this.metaLoading = false;
        this.likedByMe = false;
if (this.auth.isLoggedIn()) {
  this.videoService.isLiked(id).subscribe({
    next: (liked) => {
      this.likedByMe = liked;
      this.cdr.detectChanges();
    },
    error: () => {
      this.likedByMe = false;
      this.cdr.detectChanges();
    }
  });
}
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.metaError = `Ne mogu da učitam podatke (${err?.status ?? '?'})`;
        this.metaLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadComments(id: number) {
    this.comments = [];
    this.commentsError = '';
    this.commentsLoading = true;

    this.videoService.getComments(id).subscribe({
      next: (cs) => {
        this.comments = cs ?? [];
        this.commentsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.commentsError = `Ne mogu da učitam komentare (${err?.status ?? '?'})`;
        this.commentsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    ev?.stopPropagation();
    if (!userId) return;
    this.router.navigate(['/user-profile', userId]);
  }

  toggleLike(ev?: Event) {
  ev?.stopPropagation();
  ev?.preventDefault();

  // samo ulogovani korisnici
  if (!this.auth.isLoggedIn()) {
    this.router.navigate(['/login']);
    return;
  }

  if (!this.video || !this.id) return;
  if (this.likeBusy) return;

  this.likeBusy = true;

  const req$ = this.likedByMe
    ? this.videoService.unlike(this.id)
    : this.videoService.like(this.id);

  req$.subscribe({
    next: (newCount) => {
      this.video!.likeCount = Number(newCount ?? this.video!.likeCount ?? 0);
      this.likedByMe = !this.likedByMe;
      this.likeBusy = false;
      this.cdr.detectChanges();
    },
    error: () => {
      this.likeBusy = false;
      this.cdr.detectChanges();
    }
  });
}

isLoggedIn(): boolean {
  return this.auth.isLoggedIn();
}


}
