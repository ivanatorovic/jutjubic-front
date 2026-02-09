import { Routes } from '@angular/router';
import { UploadComponent } from './pages/upload/upload.component';
import { VideosComponent } from './pages/videos/videos.component';
import { TrendingComponent } from './pages/trending/trending.component';
import { WatchPartyLiveComponent } from './pages/watch-party-live.component/watch-party-live.component';

export const routes: Routes = [
  { path: 'upload', component: UploadComponent },
  { path: 'videos', component: VideosComponent },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  { path: '', redirectTo: 'videos', pathMatch: 'full' },
  {
    path: 'watch/:id',
    loadComponent: () => import('./pages/watch/watch.component').then((m) => m.WatchComponent),
  },
  { path: 'trending', component: TrendingComponent },
  {
    path: 'user-profile/:id',
    loadComponent: () =>
      import('./pages/user-profile/user-profile.component').then((m) => m.UserProfileComponent),
  },
  {
    path: 'watch-party-rooms',
    loadComponent: () =>
      import('./pages/watch-party-rooms.component/watch-party-rooms.component').then(
        (m) => m.WatchPartyRoomsComponent,
      ),
  },
  {
    path: 'watch-party/:roomId',
    loadComponent: () =>
      import('./pages/watch-party-room.component/watch-party-room.component').then(
        (m) => m.WatchPartyRoomComponent,
      ),
  },
  { path: 'watch-party/:roomId/live/:videoId', component: WatchPartyLiveComponent },
];
