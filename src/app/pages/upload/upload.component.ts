import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VideoService } from '../../services/video-service/video';
import { UploadProgressService } from '../../services/upload-progress.service';

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

  constructor(
    private videoService: VideoService,
    private router: Router,
    private uploadProgress: UploadProgressService
  ) {}

  ngOnDestroy(): void {
    this.revokeThumbPreview();
  }

  // ===== UI HELPERS =====

  tagsList(): string[] {
    return this.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
  }

  formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
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

  // ===== FILE HANDLING =====

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


  // ===== UPLOAD =====

upload() {
  if (this.uploading) return;

  const title = this.title.trim();
  const description = this.description.trim();
  const tagsRaw = this.tags.trim();

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

  const info = {
    title,
    description,
    location: this.location?.trim() || null,
    tags: parsedTags,
  };

    this.msg = 'Upload pokrenut ✅';
    this.uploading = true;
    this.progress = 0;

    // shared banner state
    this.uploadProgress.setUploading(0, 'Upload u toku…');

    // prebacuj odmah na videos
    this.router.navigate(['/videos']);

    this.videoService.upload(info, this.thumbnailFile, this.videoFile).subscribe({
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
