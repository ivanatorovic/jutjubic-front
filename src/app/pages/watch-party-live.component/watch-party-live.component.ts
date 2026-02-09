import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Video, VideoService } from '../../services/video-service/video';
import { WatchPartyWsService } from '../../services/watch-party-service/watch-party-ws-service';

@Component({
  selector: 'app-watch-party-live',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './watch-party-live.component.html',
  styleUrls: ['./watch-party-live.component.scss'],
})
export class WatchPartyLiveComponent implements OnInit, OnDestroy {
  error = '';

  roomId = '';
  videoId: number | null = null;
  src = '';

  video: Video | null = null;
  metaLoading = false;
  metaError = '';

  autoplayBlocked = false;

  private destroy$ = new Subject<void>();

  @ViewChild('player') playerRef?: ElementRef<HTMLVideoElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public videoService: VideoService,
    private wpWs: WatchPartyWsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const roomId = pm.get('roomId') ?? '';
      const videoIdStr = pm.get('videoId');
      const id = Number(videoIdStr);

      if (!roomId) {
        this.error = 'Neispravan roomId';
        this.cdr.detectChanges();
        return;
      }
      if (!videoIdStr || Number.isNaN(id) || id <= 0) {
        this.error = 'Neispravan ID videa';
        this.cdr.detectChanges();
        return;
      }

      this.roomId = roomId;
      this.videoId = id;
      this.error = '';
      this.metaError = '';

      // ✅ Obezbedi WS konekciju (ne diskonektuj u destroy jer je globalna)
      // Ako ti connect() u servisu radi disconnect() uvek, preporuka je da ga unaprediš
      // (vidi ispod "BONUS: connectIfNeeded").
      this.wpWs.connect(this.roomId);

      this.src = this.videoService.streamUrl(id);
      this.loadMeta(id);

      setTimeout(() => {
        const el = this.playerRef?.nativeElement;
        if (el) this.tryAutoplay(el);
      }, 0);

      this.cdr.detectChanges();
    });
  }

  private loadMeta(id: number) {
    this.video = null;
    this.metaError = '';
    this.metaLoading = true;
    this.cdr.detectChanges();

    this.videoService.getById(id).subscribe({
      next: (v) => {
        this.video = v;
        this.metaLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.metaError = 'Video jos uvek nije dostupan';
        this.metaLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  tryAutoplay(videoEl: HTMLVideoElement) {
    videoEl.muted = true;

    const p = videoEl.play();
    if (p && typeof (p as any).catch === 'function') {
      p.catch(() => {
        this.autoplayBlocked = true;
        this.cdr.detectChanges();
      });
    }
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

  async copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  // ✅ best-effort: ako host napušta live stranicu, resetuj currentVideoId na serveru
  ngOnDestroy(): void {
    // pošalji STOP samo ako sam host
    if (this.roomId && this.isHostNow()) {
      this.wpWs.stop(this.roomId);
    }

    this.destroy$.next();
    this.destroy$.complete();
    // ❌ ne disconnectuj ovde (global listener treba WS)
  }

  // (bonus) pokušaj i na zatvaranje taba
  @HostListener('window:beforeunload')
  beforeUnload() {
    if (this.roomId && this.isHostNow()) {
      this.wpWs.stop(this.roomId);
    }
  }

  /** ✅ Host detekcija iz ws.state$ + email iz tokena */
  private isHostNow(): boolean {
    try {
      const st: any = this.wpWs.state$.value;
      if (!st || String(st.roomId ?? '') !== this.roomId) return false;

      const myEmail = (this.getEmailFromToken() ?? '').trim().toLowerCase();
      if (!myEmail) return false;

      const members = Array.isArray(st.members) ? st.members : [];
      const hostUserId = Number(st.hostUserId);

      const host = members.find((m: any) => Number(m.userId) === hostUserId);
      const hostEmail = String(host?.email ?? '')
        .trim()
        .toLowerCase();

      return !!hostEmail && hostEmail === myEmail;
    } catch {
      return false;
    }
  }

  private getEmailFromToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(this.base64UrlDecode(payload));
      return (json.email ?? json.sub ?? null) as string | null;
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
}
