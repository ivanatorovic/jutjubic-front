import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VideoService } from '../../services/video-service/video';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent {
  title = '';
  description = '';

  thumbnailFile: File | null = null;
  videoFile: File | null = null;

  msg = '';

  constructor(private videoService: VideoService) {}

  onThumbnailChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.thumbnailFile = input.files?.[0] ?? null;
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

    const info = {
      title: this.title,
      description: this.description,
    };

    this.msg = 'Upload u toku...';

    this.videoService.upload(info, this.thumbnailFile, this.videoFile).subscribe({
      next: () => (this.msg = 'Upload uspešan ✅'),
      error: (err) => (this.msg = 'Greška ❌ ' + (err?.error?.message ?? err.status)),
    });
  }
}
