import { Routes } from '@angular/router';
import { AnalyzerComponent } from './pages/analyzer/analyzer.component';
import { HomeComponent } from './pages/home/home.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { JobsListComponent } from './pages/jobs-list/jobs-list.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'analyzer',
    component: AnalyzerComponent,
  },
  {
    path: 'jobs',
    component: JobsListComponent,
  },
  {
    path: 'jobs/:jobId',
    component: JobDetailComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
