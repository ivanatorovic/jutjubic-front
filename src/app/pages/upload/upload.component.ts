import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VideoService } from '../../services/video-service/video';
import { UploadProgressService } from '../../services/upload-progress.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(
    private videoService: VideoService,
    private router: Router,
    private uploadProgress: UploadProgressService
  ) {}

  ngOnDestroy(): void {
    this.revokeThumbPreview();
  }

  private revokeThumbPreview() {
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
      this.thumbnailPreviewUrl = null;
    }
  }

  onThumbnailChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.thumbnailFile = input.files?.[0] ?? null;

    this.revokeThumbPreview();
    if (this.thumbnailFile) {
      this.thumbnailPreviewUrl = URL.createObjectURL(this.thumbnailFile);
    }
  }

  onVideoChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.videoFile = input.files?.[0] ?? null;
  }

  upload() {
    if (!this.thumbnailFile || !this.videoFile) {
      this.msg = 'Moraš izabrati thumbnail i video fajl.';
      return;
    }

    const parsedTags = this.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const info = {
      title: this.title,
      description: this.description,
      location: this.location?.trim() || null,
      tags: parsedTags,
    };

    this.msg = 'Upload pokrenut ✅';
    this.uploading = true;
    this.progress = 0;

    // ✅ postavi stanje u shared servisu PRE redirect-a
    this.uploadProgress.setUploading(0, 'Upload u toku…');

    // ✅ odmah prebaci na videos
    this.router.navigate(['/videos']);

    // ✅ upload nastavlja u pozadini, a progress ide u servis
    this.videoService.upload(info, this.thumbnailFile, this.videoFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? 0;
          if (total > 0) {
            const p = Math.round((event.loaded / total) * 100);
            this.progress = p;
            this.uploadProgress.setUploading(p, `Upload u toku… ${p}%`);
          } else {
            // ako nema total, bar pokaži "radi"
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
