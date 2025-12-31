import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Video {
  id: number;
  title: string;
  description: string;
  // dodaj još polja ako ih imaš (createdAt, tags, location...)
  thumbnailPath?: string;
  videoPath?: string;
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
}
