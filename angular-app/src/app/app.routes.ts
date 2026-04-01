import { Routes } from '@angular/router';
import { AnalyzerComponent } from './pages/analyzer/analyzer.component';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { JobsListComponent } from './pages/jobs-list/jobs-list.component';
import { LiveMatchesComponent } from './pages/live-matches/live-matches.component';
import { authGuard } from './services/auth.guard';
import { unauthGuard } from './services/unauth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'analyzer',
    component: AnalyzerComponent,
    canActivate: [authGuard],
  },
  {
    path: 'busquedas',
    component: JobsListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'busquedas/:jobId',
    component: JobDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'en-vivo',
    component: LiveMatchesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'acceso',
    component: AuthComponent,
    canActivate: [unauthGuard],
  },
  {
    path: 'jobs',
    redirectTo: 'busquedas',
  },
  {
    path: 'jobs/:jobId',
    redirectTo: 'busquedas/:jobId',
  },
  {
    path: '**',
    redirectTo: 'acceso',
  },
];
