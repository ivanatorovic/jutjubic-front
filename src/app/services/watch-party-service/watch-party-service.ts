import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface WatchPartyRoomPublic {
  roomId: string;
  hostUserId: number;
  hostUsername: string;
  isPublic: boolean;
  memberCount: number;
  videoCount: number;
}

export interface RoomDetailsRes {
  roomId: string;
  hostUserId: number;
  hostUsername: string;
  isPublic: boolean;
  memberCount: number;
  videoCount: number;
  videoIds: number[];
  currentVideoId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class WatchPartyService {
  constructor(private http: HttpClient) {}

  listPublicRooms(): Observable<WatchPartyRoomPublic[]> {
    return this.http.get<WatchPartyRoomPublic[]>(`${environment.apiUrl}/api/watch-party/rooms`);
  }

  myRooms(): Observable<WatchPartyRoomPublic[]> {
    return this.http.get<WatchPartyRoomPublic[]>(`${environment.apiUrl}/api/watch-party/my-rooms`);
  }

  addVideo(roomId: string, videoId: number): Observable<WatchPartyRoomPublic> {
    return this.http.post<WatchPartyRoomPublic>(
      `${environment.apiUrl}/api/watch-party/rooms/${roomId}/videos`,
      {
        videoId,
      },
    );
  }

  createRoom(isPublic: boolean) {
    return this.http.post<WatchPartyRoomPublic>(`${environment.apiUrl}/api/watch-party/rooms`, {
      isPublic,
    });
  }

  getRoom(roomId: string) {
    return this.http.get<RoomDetailsRes>(`${environment.apiUrl}/api/watch-party/rooms/${roomId}`);
  }
}
