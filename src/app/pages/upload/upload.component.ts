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

    const parsedTags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (parsedTags.length === 0) {
      this.msg = 'Unesi bar jedan tag.';
      return;
    }

    // ✅ NEMA geolocation poziva ovde -> nema popupa na upload dugmetu
    const info = {
      title,
      description,
      location: this.location?.trim() || null,
      tags: parsedTags,

      // ✅ koordinate iz URL-a (ili null ako user blokirao)
      latitude: this.currentLat,
      longitude: this.currentLon,
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
}
