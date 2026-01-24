import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface VideoDto {
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
}

@Injectable({ providedIn: 'root' })
export class LocalTrendingService {
  private baseUrl = 'http://localhost:8080/api/trending';

  constructor(private http: HttpClient) {}

  // ✅ Pozivati samo iz user gesture (klik), ne iz ngOnInit
  getBrowserLocation(timeoutMs = 10000): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('GEO: navigator.geolocation nije dostupan');
        return resolve(null);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('GEO OK:', pos.coords.latitude, pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        (err) => {
          console.warn('GEO ERR:', err.code, err.message);
          resolve(null);
        },
        // ✅ brže i stabilnije, ne forsira stalno “fresh” GPS
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
      );
    });
  }

  getLocalTrending(radiusKm: number, lat?: number, lon?: number): Observable<VideoDto[]> {
    let params = new HttpParams().set('radiusKm', String(radiusKm));

    if (lat != null && lon != null) {
      params = params.set('lat', String(lat)).set('lon', String(lon));
    }

    // ako nema lat/lon -> backend radi IP fallback
    return this.http.get<VideoDto[]>(this.baseUrl, { params });
  }
  async getGeoPermissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  const navAny = navigator as any;

  // Permissions API nije svuda isto podržan
  if (!navAny.permissions?.query) return 'unknown';

  try {
    const res = await navAny.permissions.query({ name: 'geolocation' });
    return res.state as 'granted' | 'prompt' | 'denied';
  } catch {
    return 'unknown';
  }
}

}
