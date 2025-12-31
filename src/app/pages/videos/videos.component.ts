import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Video, VideoService } from '../../videos/video';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss']
})
export class VideosComponent implements OnInit {
  videos: Video[] = [];
  loading = false;
  error = '';
  openedId: number | null = null;

  constructor(
    public videoService: VideoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges(); // 👈 odmah prikaži "Učitavam..."

    this.videoService.getAll().subscribe({
      next: (data) => {
        this.videos = data ?? [];
        this.loading = false;
        this.cdr.detectChanges(); // 👈 OVO je ključno
      },
      error: (err) => {
        this.error = `Greška (${err?.status ?? ''})`;
        this.loading = false;
        this.cdr.detectChanges(); // 👈 i ovde
      }
    });
  }

  toggleVideo(id: number) {
    this.openedId = this.openedId === id ? null : id;
    this.cdr.detectChanges();
  }
}
