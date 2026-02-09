import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth-service/auth.service';
import {
  WatchPartyService,
  WatchPartyRoomPublic,
} from '../../services/watch-party-service/watch-party-service';

@Component({
  selector: 'app-watch-party-rooms',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './watch-party-rooms.component.html',
  styleUrls: ['./watch-party-rooms.component.scss'],
})
export class WatchPartyRoomsComponent implements OnInit, OnDestroy {
  rooms: WatchPartyRoomPublic[] = [];
  loading = false;
  error = '';
  currentUserId: number | null = null;
  createError = '';
  createPanelOpen = false;
  isPublicSelected: boolean = true; // default Javna
  private creatingNow = false; // samo guard da ne napravi 2 sobe brzim klikom

  private destroy$ = new Subject<void>();

  constructor(
    private wp: WatchPartyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getUserIdFromToken();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.wp
      .listPublicRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rooms = data ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = `Greška (${err?.status ?? ''})`;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ✅ za sada prazno (placeholder), jer još nemaš room page
  openRoom(roomId: string): void {
    this.router.navigate(['/watch-party', roomId]);
  }

  openUser(userId?: number, ev?: Event): void {
    ev?.stopPropagation();
    if (!userId) return;
    this.router.navigate(['/user-profile', userId]);
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/videos']);
  }

  createRoom(): void {
    const isPublic = window.confirm(
      'Da li želiš da soba bude JAVNA?\n\n' +
        'OK = Javna (svako može da uđe)\n' +
        'Cancel = Privatna (samo preko linka)',
    );

    this.wp.createRoom(isPublic).subscribe({
      next: (room) => {
        this.router.navigate(['/watch-party', room.roomId]);
      },
      error: (err: any) => {
        if (err?.status === 401) {
          this.createError = 'Moraš biti ulogovan da bi napravio sobu.';
        } else {
          this.createError = `Ne mogu da napravim sobu (${err?.status ?? '?'})`;
        }
        this.cdr.detectChanges();
      },
    });
  }

  openCreatePanel(): void {
    this.createError = '';
    this.isPublicSelected = true;
    this.createPanelOpen = true;
    this.cdr.detectChanges();
  }

  cancelCreate(): void {
    this.createPanelOpen = false;
    this.createError = '';
    this.cdr.detectChanges();
  }

  confirmCreateRoom(): void {
    if (this.creatingNow) return;
    this.creatingNow = true;
    this.createError = '';

    this.wp.createRoom(this.isPublicSelected).subscribe({
      next: (room) => {
        // ✅ odmah zatvori panel
        this.createPanelOpen = false;

        // ✅ odmah osveži listu soba (da ne mora refresh)
        this.load();

        this.creatingNow = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.creatingNow = false;

        if (err?.status === 401) {
          this.createError = 'Moraš biti ulogovan da bi napravio sobu.';
        } else {
          this.createError = `Ne mogu da napravim sobu (${err?.status ?? '?'})`;
        }
        this.cdr.detectChanges();
      },
    });
  }
}
