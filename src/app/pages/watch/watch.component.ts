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
  likeAuthError = false;
  comments: CommentPublicDto[] = [];
  commentsLoading = false;
  commentsError = '';
  likedByMe = false;
  likeBusy = false;

  newComment = '';
  postingComment = false;
  postError = '';
  composeFocused = false;

  commentsPage = 0;
  commentsSize = 5;
  commentsTotal = 0;
  commentsLast = false;
  loadingMore = false;

  currentUsername: string | null = null;
  currentUserId: number | null = null;

  sideVideos: Video[] = [];
  sideLoading = false;
  sideError = '';

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

      this.currentUserId = this.getUserIdFromToken();
      this.currentUsername = this.getUsernameFromToken();

      this.error = '';
      this.id = id;
      this.src = this.videoService.streamUrl(id);

      this.loadMeta(id);
      this.resetCommentsPaging();
      this.loadCommentsPage(id, true);

      this.loadSideVideos(id);

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
            },
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

  private loadSideVideos(currentId: number) {
    this.sideVideos = [];
    this.sideError = '';
    this.sideLoading = true;

    this.videoService.getAll().subscribe({
      next: (list) => {
        const all = list ?? [];
        const filtered = all.filter((v) => v.id !== currentId);

        this.sideVideos = filtered.slice(0, 12);

        this.sideLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.sideError = `Ne mogu da učitam ostale videe (${err?.status ?? '?'})`;
        this.sideLoading = false;
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

  onCommentInput(ev: Event) {
    const ta = ev.target as HTMLTextAreaElement;
    this.newComment = ta.value ?? '';
    this.composeFocused = true;

    ta.style.height = 'auto';
    ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
  }

  cancelComment() {
    this.newComment = '';
    this.postError = '';
    this.composeFocused = false;
  }

  postComment() {
    if (!this.id) return;
    const text = this.newComment.trim();
    if (!text) return;

    this.postingComment = true;
    this.postError = '';

    this.videoService.addComment(this.id, text).subscribe({
      next: (_) => {
        this.newComment = '';
        this.composeFocused = false;

        if (this.id) {
          this.resetCommentsPaging();
          this.loadCommentsPage(this.id, true);
        }

        if (this.video) {
          this.video.commentCount = (this.video.commentCount ?? 0) + 1;
        }

        this.postingComment = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.postError =
          err?.status === 401
            ? 'Moraš biti ulogovan da komentarišeš.'
            : `Ne mogu da pošaljem komentar (${err?.status ?? '?'})`;
        this.postingComment = false;
        this.cdr.detectChanges();
      },
    });
  }

  private getUsernameFromToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(this.base64UrlDecode(payload));
      return json.username ?? json.sub ?? json.email ?? null;
    } catch {
      return null;
    }
  }

  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    return atob(base64);
  }

  logout() {
    localStorage.removeItem('access_token');
    this.currentUserId = null;
    this.currentUsername = null;
    this.router.navigate(['/videos']);
  }

  private getUserIdFromToken(): number | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      const id = json.userId ?? json.id ?? null;
      return typeof id === 'number' ? id : id ? Number(id) : null;
    } catch {
      return null;
    }
  }

  private resetCommentsPaging() {
    this.comments = [];
    this.commentsError = '';
    this.commentsLoading = false;

    this.commentsPage = 0;
    this.commentsTotal = 0;
    this.commentsLast = false;
    this.loadingMore = false;
  }

  private loadCommentsPage(id: number, initial = false) {
    if (this.commentsLoading || this.loadingMore) return;
    if (!initial && this.commentsLast) return;

    if (initial) this.commentsLoading = true;
    else this.loadingMore = true;

    this.commentsError = '';

    this.videoService.getCommentsPaged(id, this.commentsPage, this.commentsSize).subscribe({
      next: (page) => {
        const items = page?.content ?? [];
        this.comments = [...this.comments, ...items];

        this.commentsTotal = page?.totalElements ?? this.comments.length;
        this.commentsLast = !!page?.last;

        this.commentsPage = (page?.number ?? this.commentsPage) + 1;

        if (this.video) {
          this.video.commentCount = this.commentsTotal;
        }

        this.commentsLoading = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.commentsError = `Ne mogu da učitam komentare (${err?.status ?? '?'})`;
        this.commentsLoading = false;
        this.loadingMore = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMoreComments() {
    if (!this.id) return;
    this.loadCommentsPage(this.id, false);
  }

  toggleLike(ev?: Event) {
    ev?.stopPropagation();
    ev?.preventDefault();

    if (!this.auth.isLoggedIn()) {
      this.likeAuthError = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.likeAuthError = true;

        this.cdr.detectChanges();
      }, 0);

      return;
    }

    this.likeAuthError = false;

    if (!this.video || !this.id) return;
    if (this.likeBusy) return;

    this.likeBusy = true;

    const wasLiked = this.likedByMe;
    const oldCount = Number(this.video.likeCount ?? 0);

    this.likedByMe = !wasLiked;
    this.video.likeCount = oldCount + (wasLiked ? -1 : 1);
    if (this.video.likeCount < 0) this.video.likeCount = 0;

    const req$ = wasLiked ? this.videoService.unlike(this.id) : this.videoService.like(this.id);

    req$.subscribe({
      next: (newCount) => {
        this.video!.likeCount = Number(newCount ?? this.video!.likeCount ?? 0);
        this.likeBusy = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.likedByMe = wasLiked;
        this.video!.likeCount = oldCount;
        this.likeBusy = false;
        this.cdr.detectChanges();
      },
    });
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  tryAutoplay(videoEl: HTMLVideoElement) {
    videoEl.muted = true;

    const p = videoEl.play();
    if (p && typeof (p as any).catch === 'function') {
      p.catch((e: any) => {});
    }
  }
}
