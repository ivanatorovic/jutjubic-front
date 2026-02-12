import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of, takeUntil, catchError } from 'rxjs';

import { AuthService } from '../../services/auth-service/auth.service';
import { Video, VideoService } from '../../services/video-service/video';
import {
  RoomDetailsRes,
  WatchPartyService,
} from '../../services/watch-party-service/watch-party-service';
import { WatchPartyWsService } from '../../services/watch-party-service/watch-party-ws-service';

type RoomMember = { userId: number; username: string; email?: string | null };

@Component({
  selector: 'app-watch-party-room',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './watch-party-room.component.html',
  styleUrls: ['./watch-party-room.component.scss'],
})
export class WatchPartyRoomComponent implements OnInit, OnDestroy {
  roomId = '';
  room: RoomDetailsRes | null = null;

  videos: Video[] = [];
  loading = false;
  error = '';

  currentEmail: string | null = null;

  isHost = false;
  isMember = false;
  flagsReady = false;

  members: RoomMember[] = [];

  inviteLink = '';
  copied = false;

  startError = '';
  joinHint = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private wp: WatchPartyService,
    private ws: WatchPartyWsService,
    private videoService: VideoService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentEmail = this.getEmailFromToken();

    
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((pm) => {
      const rid = pm.get('roomId');
      if (!rid) {
        this.error = 'Neispravan ID sobe';
        this.cdr.detectChanges();
        return;
      }

      this.roomId = rid;
      this.inviteLink = `${window.location.origin}/watch-party/${rid}`;
      this.copied = false;
      this.startError = '';
      this.joinHint = '';

      this.loadRoomAndConnect();
    });

    
    this.ws.error$.pipe(takeUntil(this.destroy$)).subscribe((msg) => {
      if (!msg) return;
      this.startError = msg;
      this.cdr.detectChanges();
    });

    
    this.ws.state$.pipe(takeUntil(this.destroy$)).subscribe((st: any) => {
      if (!st) return;
      if (!this.room) return;
      if (String(st.roomId ?? '') !== this.roomId) return; 

      
      if (Array.isArray(st.members)) {
        this.members = st.members.map((m: any) => ({
          userId: Number(m.userId),
          username: String(m.username ?? m.userName ?? ''),
          email: m.email ?? null,
        }));
      }

      const nextVideoIds: number[] = Array.isArray(st.videoIds)
        ? st.videoIds.map((x: any) => Number(x))
        : (this.room.videoIds ?? []);

      this.room = {
        ...this.room,
        memberCount: this.members.length || this.room.memberCount,
        videoCount: nextVideoIds.length || this.room.videoCount,
        videoIds: nextVideoIds,
        currentVideoId:
          st.currentVideoId !== undefined
            ? (st.currentVideoId as number | null)
            : this.room.currentVideoId,
      };

      this.flagsReady = true;
      this.recomputeFlags();

      this.loadVideos(this.room.videoIds ?? []);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
  }

  private loadRoomAndConnect() {
    this.loading = true;
    this.error = '';
    this.room = null;
    this.members = [];
    this.isHost = false;
    this.isMember = false;
    this.flagsReady = false;
    this.cdr.detectChanges();

    this.wp.getRoom(this.roomId).subscribe({
      next: (r) => {
        this.room = r;
        this.syncFromRoom(r);

        this.loading = false;
        this.cdr.detectChanges();

        this.loadVideos(r.videoIds ?? []);

        
        this.ws.connect(this.roomId);
      },
      error: (err: any) => {
        this.error = `Ne mogu da učitam sobu (${err?.status ?? '?'})`;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private syncFromRoom(r: RoomDetailsRes) {
    const snap: any[] = (r as any).members ?? [];
    this.members = snap.map((m: any) => ({
      userId: Number(m.userId),
      username: String(m.username ?? m.userName ?? ''),
      email: m.email ?? null,
    }));
  }

  private recomputeFlags() {
    if (!this.room) {
      this.isHost = false;
      this.isMember = false;
      return;
    }

    const myEmail = (this.currentEmail ?? '').trim().toLowerCase();
    if (!myEmail) {
      this.isHost = false;
      this.isMember = false;
      return;
    }

    const membersWithEmail = (this.members ?? [])
      .filter((m) => !!m.email)
      .map((m) => ({ ...m, email: String(m.email).trim().toLowerCase() }));

    const hostMember = membersWithEmail.find((m) => m.userId === this.room!.hostUserId);
    this.isHost = !!hostMember?.email && hostMember.email === myEmail;

    const byEmailMember = membersWithEmail.some((m) => m.email === myEmail);
    this.isMember = this.isHost || byEmailMember;

    if (membersWithEmail.length === 0) {
      this.flagsReady = false;
    }
  }

  private loadVideos(ids: number[]) {
    this.videos = [];
    if (!ids || ids.length === 0) {
      this.cdr.detectChanges();
      return;
    }

    forkJoin(
      ids.map((id) => this.videoService.getById(id).pipe(catchError(() => of(null)))),
    ).subscribe((arr) => {
      this.videos = (arr ?? []).filter(Boolean) as Video[];
      this.cdr.detectChanges();
    });
  }

  join(): void {
    if (!this.room) return;

    if (!this.isLoggedIn()) {
      this.joinHint = 'Moraš biti ulogovan da uđeš u sobu.';
      setTimeout(() => {
        this.joinHint = '';
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
      return;
    }

    if (!this.flagsReady) {
      this.joinHint = 'Učitavam članove… sačekaj sekund.';
      setTimeout(() => {
        this.joinHint = '';
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
      return;
    }

    if (this.isHost) {
      this.joinHint = 'Ti si host ove sobe';
      setTimeout(() => {
        this.joinHint = '';
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
      return;
    }

    if (this.isMember) {
      this.joinHint = 'Već si u sobi';
      setTimeout(() => {
        this.joinHint = '';
        this.cdr.detectChanges();
      }, 2000);
      this.cdr.detectChanges();
      return;
    }

    this.startError = '';
    this.joinHint = 'Ušao si u sobu';
    setTimeout(() => {
      this.joinHint = '';
      this.cdr.detectChanges();
    }, 2000);

    this.ws.join(this.roomId);
    this.cdr.detectChanges();
  }

  onVideoClick(videoId: number) {
    if (!this.flagsReady) {
      this.ws.error$.next('Sačekaj… učitavam članove.');
      return;
    }

    
    if (this.room?.currentVideoId === videoId) {
      this.router.navigate(['/watch-party', this.roomId, 'live', videoId]);
      return;
    }

    
    if (!this.isHost) {
      this.ws.error$.next('Samo host može pokrenuti video.');
      return;
    }

    
    this.ws.start(this.roomId, videoId);

    
    this.router.navigate(['/watch-party', this.roomId, 'live', videoId]);
  }

  goLive(): void {
    const vid = this.room?.currentVideoId;
    if (!vid) return;
    this.router.navigate(['/watch-party', this.roomId, 'live', Number(vid)]);
  }

  thumbnailUrl(id: number) {
    return this.videoService.thumbnailUrl(id);
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  async copyInvite(): Promise<void> {
    this.copied = false;
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.copied = true;
    } catch {
      this.copied = false;
    }
    this.cdr.detectChanges();
  }

  logout() {
    localStorage.removeItem('access_token');
    this.currentEmail = null;
    
    this.ws.disconnect();
    this.router.navigate(['/videos']);
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
