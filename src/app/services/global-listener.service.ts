import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter, map, distinctUntilChanged, withLatestFrom } from 'rxjs/operators';
import { WatchPartyWsService } from './watch-party-service/watch-party-ws-service';

type MemberLike = { email?: string | null };

@Injectable({ providedIn: 'root' })
export class WatchPartyGlobalListenerService {
  private lastRouteKey: string | null = null;
  private myEmail$ = new BehaviorSubject<string | null>(this.getEmailFromToken());

  constructor(
    private ws: WatchPartyWsService,
    private router: Router,
  ) {}

  init() {
    // roomMembership$: roomId -> isMember (na osnovu poslednjeg state-a)
    const roomMembership$ = this.ws.state$.pipe(
      filter((st: any) => !!st && !!st.roomId),
      map((st: any) => {
        const roomId = String(st.roomId ?? '');
        const members: MemberLike[] = Array.isArray(st.members) ? st.members : [];
        return { roomId, members };
      }),
      // da ne spamuje kad stiže isti state
      distinctUntilChanged((a, b) => a.roomId === b.roomId && a.members === b.members),
    );

    // startEvent$: samo VIDEO_STARTED
    const startEvent$ = this.ws.events$.pipe(
      filter((ev: any) => !!ev && (ev.type === 'VIDEO_STARTED' || !!ev.videoId)),
      map((ev: any) => ({
        roomId: String(ev.roomId ?? ''),
        videoId: Number(ev.videoId),
        eventId: String(ev.eventId ?? ''),
      })),
      filter((x) => !!x.roomId && !!x.videoId && !!x.eventId),
    );

    // ✅ KLJUČNO: reaguj SAMO na startEvent, a membership uzmi "latest" u tom trenutku
    startEvent$
      .pipe(withLatestFrom(roomMembership$, this.myEmail$))
      .pipe(
        filter(([ev, mem]) => ev.roomId === mem.roomId),
        filter(([_, mem, myEmail]) => {
          const me = (myEmail ?? '').trim().toLowerCase();
          if (!me) return false;

          return (mem.members ?? []).some(
            (m) =>
              String(m.email ?? '')
                .trim()
                .toLowerCase() === me,
          );
        }),
      )
      .subscribe(([ev]) => {
        const key = `${ev.roomId}:${ev.eventId}`;
        if (this.lastRouteKey === key) return;
        this.lastRouteKey = key;

        this.router.navigate(['/watch-party', ev.roomId, 'live', ev.videoId]);
      });
  }

  /** pozovi posle login/logout */
  refreshAuthEmail() {
    this.myEmail$.next(this.getEmailFromToken());
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
