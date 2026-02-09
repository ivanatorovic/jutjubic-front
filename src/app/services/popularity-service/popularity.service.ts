import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PopularVideoDto {
  videoId: number;
  title: string;
  thumbnailPath: string | null;
  score: number;
}

export interface PopularBlockDto {
  runAt: string;        // LocalDateTime kao string
  top3: PopularVideoDto[];
}

@Injectable({ providedIn: 'root' })
export class PopularityService {
  private readonly api = `${environment.apiUrl}/api/popularity`;

  constructor(private http: HttpClient) {}

  latest(): Observable<PopularBlockDto> {
    return this.http.get<PopularBlockDto>(`${this.api}/latest`);
  }
}
