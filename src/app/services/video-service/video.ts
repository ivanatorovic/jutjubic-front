import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Video {
  id: number;
  title: string;
  description: string;

  thumbnailPath?: string;
  videoPath?: string;

  // ✅ sa backenda (public prikaz)
  username?: string;
  userId?: number;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string; // ISO string
  location?: string;
}

export interface CommentPublicDto {
  id: number;
  text: string;
  userId: number;
  username: string;
  createdAt: string; // ISO
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Video[]>(`${environment.apiUrl}/api/videos`);
  }

  thumbnailUrl(id: number) {
    return `${environment.apiUrl}/api/videos/${id}/thumbnail`;
  }

  streamUrl(id: number) {
    return `${environment.apiUrl}/api/videos/${id}/stream`;
  }

  upload(info: any, thumbnail: File, video: File) {
    const fd = new FormData();
    fd.append('info', JSON.stringify(info));
    fd.append('thumbnail', thumbnail);
    fd.append('video', video);
    return this.http.post(`${environment.apiUrl}/api/videos/upload`, fd);
  }

  getById(id: number) {
    return this.http.get<Video>(`${environment.apiUrl}/api/videos/${id}`);
  }

  getComments(id: number) {
    return this.http.get<CommentPublicDto[]>(`${environment.apiUrl}/api/videos/${id}/comments`);
  }
}
