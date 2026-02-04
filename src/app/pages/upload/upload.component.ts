// upload.component.ts
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { VideoService } from '../../services/video-service/video';
import { UploadProgressService } from '../../services/upload-progress.service';
import { AuthService } from '../../services/auth-service/auth.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent implements OnDestroy {
  title = '';
  description = '';
  tags = '';
  location = '';

  thumbnailFile: File | null = null;
  videoFile: File | null = null;
  thumbnailPreviewUrl: string | null = null;

  msg = '';
  progress = 0;
  uploading = false;

  // ✅ koordinate dolaze IZ URL-a (postavio openUpload)
  currentLat: number | null = null;
  currentLon: number | null = null;
  locAllowed: boolean | null = null;

  scheduled = false;
  scheduledAtLocal = '';
  scheduledDate = ''; // npr "2026-02-01"
scheduledTime = ''; // npr "18:30"

premYear: number = new Date().getFullYear();
premMonth: number = new Date().getMonth() + 1; // 1-12
premDay: number | null = null;                // 1-31
premHour: number | null = null;               // 0-23
premMinute: number | null = null;             // 0-59 (mi ćemo 0,5,10... ili 0..59)

years: number[] = [];
months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
days: number[] = [];
hours: number[] = Array.from({ length: 24 }, (_, i) => i);
minutes: number[] = Array.from({ length: 60 }, (_, i) => i); // ili na 5 min: length:12 => i*5



  constructor(
    private videoService: VideoService,
    private router: Router,
    private route: ActivatedRoute,
    private uploadProgress: UploadProgressService,
    private auth: AuthService
  ) {
    this.route.queryParams.subscribe((p) => {
      this.currentLat = p['lat'] != null ? Number(p['lat']) : null;
      this.currentLon = p['lon'] != null ? Number(p['lon']) : null;
      this.locAllowed = p['locAllowed'] != null ? Number(p['locAllowed']) === 1 : null;
    });
  }

ngOnInit(): void {
  const now = new Date();

  // npr. dozvoli ovu i sledeću godinu
  this.years = [now.getFullYear(), now.getFullYear() + 1];

  this.updateDays();
}

updateDays() {
  if (!this.premYear || !this.premMonth) {
    this.days = [];
    return;
  }

  const daysInMonth = new Date(
    this.premYear,
    this.premMonth,
    0
  ).getDate();

  this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // resetuj dan ako je veći od dozvoljenog
  if (this.premDay && this.premDay > daysInMonth) {
    this.premDay = null;
  }
}


onScheduledToggle() {
  if (!this.scheduled) {
    this.premDay = null;
    this.premHour = null;
    this.premMinute = null;
  } else {
    // neki default da odmah vidiš
    if (this.premDay == null) this.premDay = new Date().getDate();
    if (this.premHour == null) this.premHour = new Date().getHours();
    if (this.premMinute == null) this.premMinute = 0;
  }
  this.recalcDays();
}

onMonthYearChange() {
  this.recalcDays();
}

private recalcDays() {
  const max = new Date(this.premYear, this.premMonth, 0).getDate(); // broj dana u mesecu
  this.days = Array.from({ length: max }, (_, i) => i + 1);

  // ako je prethodno izabran dan > max, ispravi
  if (this.premDay != null && this.premDay > max) this.premDay = max;
}

// ISO string koji backend očekuje: yyyy-MM-ddTHH:mm:ss
private pad2(n: number): string {
  return String(n).padStart(2, '0');
}

public buildScheduledAtIso(): string | null {
  if (!this.scheduled) return null;

  const y = this.premYear;
  const mo = this.premMonth;
  const d = this.premDay;
  const h = this.premHour;
  const mi = this.premMinute;

  if (!y || !mo || !d || h == null || mi == null) return null;

  return `${y}-${this.pad2(mo)}-${this.pad2(d)}T${this.pad2(h)}:${this.pad2(mi)}:00`;
}



  ngOnDestroy(): void {
    this.revokeThumbPreview();
  }

  tagsList(): string[] {
    return this.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
  }

  clearThumb(e: Event) {
    e.stopPropagation();
    this.thumbnailFile = null;
    this.revokeThumbPreview();
  }

  clearVideo(e: Event) {
    e.stopPropagation();
    this.videoFile = null;
  }

  private revokeThumbPreview() {
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
      this.thumbnailPreviewUrl = null;
    }
  }

  onThumbnailChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.thumbnailFile = file;
    this.revokeThumbPreview();
    if (this.thumbnailFile) {
      this.thumbnailPreviewUrl = URL.createObjectURL(this.thumbnailFile);
    }

    input.value = '';
  }

  onVideoChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.videoFile = input.files?.[0] ?? null;
    input.value = '';
  }

  upload() {
    if (this.uploading) return;

    const title = this.title.trim();
    const description = this.description.trim();
    const tagsRaw = this.tags.trim();

    if (!this.auth.isLoggedIn()) {
      this.msg = 'Moraš da budeš ulogovan da bi uploadovao video.';
      this.router.navigate(['/login']);
      return;
    }

    if (!title || !description || !tagsRaw || !this.thumbnailFile || !this.videoFile) {
      this.msg = 'Popuni naslov, opis, tagove i izaberi thumbnail + video.';
      return;
    }

  if (this.scheduled) {
  const iso = this.buildScheduledAtIso();
  if (!iso) {
    this.msg = 'Izaberi godinu, mesec, dan, sat i minut za premijeru.';
    return;
  }
}


    const parsedTags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (parsedTags.length === 0) {
      this.msg = 'Unesi bar jedan tag.';
      return;
    }
    const scheduledAt =
  this.scheduled ? `${this.scheduledDate}T${this.scheduledTime}:00` : null;

    // ✅ NEMA geolocation poziva ovde -> nema popupa na upload dugmetu
    const info = {
      title,
      description,
      location: this.location?.trim() || null,
      tags: parsedTags,

      // ✅ koordinate iz URL-a (ili null ako user blokirao)
      latitude: this.currentLat,
      longitude: this.currentLon,

    scheduled: this.scheduled,
  scheduledAt: this.buildScheduledAtIso(),
    };

    this.msg = 'Upload pokrenut ✅';
    this.uploading = true;
    this.progress = 0;

    this.uploadProgress.setUploading(0, 'Upload u toku…');

    // tvoja logika: odmah idi na videos
    this.router.navigate(['/videos']);

    this.videoService.upload(info, this.thumbnailFile!, this.videoFile!).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          if (total > 0) {
            const p = Math.round((event.loaded / total) * 100);
            this.progress = p;
            this.uploadProgress.setUploading(p, `Upload u toku… ${p}%`);
          } else {
            this.uploadProgress.setUploading(this.progress, 'Upload u toku…');
          }
        }

        if (event.type === HttpEventType.Response) {
          this.uploading = false;
          this.progress = 100;
          this.uploadProgress.setDone('Upload završen ✅');
        }
      },
      error: (err) => {
        this.uploading = false;
        const msg = err?.error?.message ?? `Greška (${err?.status ?? '?'})`;
        this.uploadProgress.setError(msg);
      },
    });
  }

  private toIsoWithSeconds(local: string): string | null {
  // local je npr: "2026-02-01T18:30"
  if (!local) return null;
  // Dodaj sekunde da Jackson sigurno parse-uje LocalDateTime
  return local.length === 16 ? `${local}:00` : local;
}



}
