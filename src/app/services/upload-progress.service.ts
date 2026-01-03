import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; label?: string }
  | { status: 'done'; progress: 100; label?: string }
  | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class UploadProgressService {
  private readonly _state$ = new BehaviorSubject<UploadState>({ status: 'idle' });
  readonly state$ = this._state$.asObservable();

  setUploading(progress: number, label?: string) {
    this._state$.next({ status: 'uploading', progress, label });
  }

  setDone(label?: string) {
    this._state$.next({ status: 'done', progress: 100, label });
  }

  setError(message: string) {
    this._state$.next({ status: 'error', message });
  }

  clear() {
    this._state$.next({ status: 'idle' });
  }
}
