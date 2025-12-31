import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Video } from '../../services/video-service/video';
// ili putanja do video.ts gde ti je tip

export interface UserPublicDto {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  address: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getById(id: number) {
    return this.http.get<UserPublicDto>(`${environment.apiUrl}/api/users/${id}`);
  }

  // ✅ samo koristi tip, ne pravi ga
  getUserVideos(id: number) {
    return this.http.get<Video[]>(`${environment.apiUrl}/api/users/${id}/videos`);
  }
}
