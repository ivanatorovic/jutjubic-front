import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RoomMemberDto {
  userId: number;
  username: string;
  email?: string | null;
}

export interface RoomStateMsg {
  roomId: string;
  hostUserId: number;
  hostUsername: string;
  members: RoomMemberDto[];
  videoIds: number[];
  currentVideoId: number | null;
}

export type RoomEventMsg = { type: 'VIDEO_STARTED'; videoId: number } | any;

@Injectable({ providedIn: 'root' })
export class WatchPartyWsService {
  private client?: Client;

  state$ = new BehaviorSubject<RoomStateMsg | null>(null);
  events$ = new BehaviorSubject<RoomEventMsg | null>(null);
  error$ = new BehaviorSubject<string>('');

  connect(roomId: string) {
    this.disconnect();

    const token = localStorage.getItem('access_token') ?? '';

    this.client = new Client({
      brokerURL: `${environment.wsUrl}/ws`, 
      reconnectDelay: 2000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (msg) => console.log('[WS]', msg),

      onConnect: () => {
        
        this.client?.subscribe(`/topic/watch-party/${roomId}/state`, (m) => {
          try {
            this.state$.next(JSON.parse(m.body));
          } catch (e) {
            console.error('[WS] bad state json', e, m.body);
          }
        });

        
        this.client?.subscribe(`/topic/watch-party/${roomId}/events`, (m) => {
          try {
            this.events$.next(JSON.parse(m.body));
          } catch (e) {
            console.error('[WS] bad event json', e, m.body);
          }
        });

        
        this.client?.subscribe(`/user/queue/watch-party/errors`, (m) => {
          try {
            this.error$.next(JSON.parse(m.body)?.message ?? 'Greška');
          } catch {
            this.error$.next('Greška');
          }
        });

        
        this.requestState(roomId);
      },
    });

    this.client.activate();
  }

  
  requestState(roomId: string) {
    if (!this.client || !this.client.connected) return;

    this.client.publish({
      destination: '/app/watch-party/state', 
      body: JSON.stringify({ roomId }),
    });
  }

  join(roomId: string) {
    if (!this.client || !this.client.connected) {
      this.error$.next('WS nije povezan');
      return;
    }

    this.client.publish({
      destination: '/app/watch-party/join',
      body: JSON.stringify({ roomId }),
    });
  }

  start(roomId: string, videoId: number) {
    if (!this.client || !this.client.connected) {
      this.error$.next('WS nije povezan');
      return;
    }

    this.client.publish({
      destination: '/app/watch-party/start',
      body: JSON.stringify({ roomId, videoId }),
    });
  }

  stop(roomId: string) {
    if (!this.client || !this.client.connected) {
      this.error$.next('WS nije povezan');
      return;
    }

    this.client.publish({
      destination: '/app/watch-party/stop',
      body: JSON.stringify({ roomId }),
    });
  }

  disconnect() {
    this.state$.next(null);
    this.events$.next(null);
    this.error$.next('');

    try {
      this.client?.deactivate();
    } catch {}
    this.client = undefined;
  }
}
