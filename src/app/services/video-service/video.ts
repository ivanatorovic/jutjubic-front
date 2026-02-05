import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Video {
  id: number;
  title: string;
  description: string;
  tags: string[];

  thumbnailPath?: string;
  videoPath?: string;

  
  username?: string;
  userId?: number;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string; 
  location?: string;
  viewCount?: number;
  scheduled?: boolean;
scheduledAt?: string; 

}

export interface CommentPublicDto {
  id: number;
  text: string;
  userId: number;
  username: string;
  createdAt: string; 
}
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; 
  size: number;
  first: boolean;
  last: boolean;
}
export type PremiereStatus = 'SCHEDULED' | 'LIVE' | 'ENDED';
export interface WatchInfoDto {
  serverNow: string;    
  streamStart: string;  
  durationSeconds: number | null;
  status: PremiereStatus;
}



@Injectable({ providedIn: 'root' })
export class VideoService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Video[]>(`${environment.apiUrl}/api/videos`);
  }

  getCommentsPaged(id: number, page: number, size: number) {
    return this.http.get<PageResponse<CommentPublicDto>>(
      `${environment.apiUrl}/api/videos/${id}/comments?page=${page}&size=${size}`
    );
  }

  thumbnailUrl(id: number) {
    return `${environment.apiUrl}/api/videos/${id}/thumbnail`;
  }

  streamUrl(id: number) {
    return `${environment.apiUrl}/api/videos/${id}/stream`;
  }

  
  upload(info: any, thumbnail: File, video: File): Observable<HttpEvent<any>> {
    const fd = new FormData();
    fd.append('info', JSON.stringify(info));
    fd.append('thumbnail', thumbnail);
    fd.append('video', video);

    return this.http.post<any>(`${environment.apiUrl}/api/videos/upload`, fd, {
      observe: 'events',
      reportProgress: true,
    });
  }

  getById(id: number) {
    return this.http.get<Video>(`${environment.apiUrl}/api/videos/${id}`);
  }

  getComments(id: number) {
    return this.http.get<CommentPublicDto[]>(`${environment.apiUrl}/api/videos/${id}/comments`);
  }

  addComment(videoId: number, text: string) {
    return this.http.post<CommentPublicDto>(
      `${environment.apiUrl}/api/videos/${videoId}/comments`,
      { text }
    );
  }

  like(videoId: number) {
  return this.http.post<number>(`${environment.apiUrl}/api/videos/${videoId}/like`, {});
}

unlike(videoId: number) {
  return this.http.delete<number>(`${environment.apiUrl}/api/videos/${videoId}/like`);
}

isLiked(videoId: number) {
  return this.http.get<boolean>(`${environment.apiUrl}/api/videos/${videoId}/like`);
}

watchInfo(id: number) {
  return this.http.get<WatchInfoDto>(`${environment.apiUrl}/api/videos/${id}/watch-info`);
}

markPremiereEnded(id: number) {
  return this.http.post<void>(`${environment.apiUrl}/api/videos/${id}/premiere-ended`, {});
}


}
