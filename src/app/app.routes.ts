import { Routes } from '@angular/router';
import { UploadComponent } from './pages/upload/upload.component';
import { VideosComponent } from './pages/videos/videos.component';

export const routes: Routes = [
  { path: 'upload', component: UploadComponent },
  { path: 'videos', component: VideosComponent },
  { path: '', redirectTo: 'videos', pathMatch: 'full' },
  { path: 'watch/:id', loadComponent: () => import('./pages/watch/watch.component').then(m => m.WatchComponent) },
  { path: 'user-profile/:id', loadComponent: () => import('./pages/user-profile/user-profile.component').then(m => m.UserProfileComponent) }

];
