import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/components/login/login.component';
import { AuthCallbackComponent } from './features/auth/components/auth-callback/auth-callback.component';
import { HomeComponent } from './features/public/home/home.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home' },
  { path: 'login', component: LoginComponent, title: 'Login' },
  { path: 'auth/callback', component: AuthCallbackComponent, title: 'Authenticating...' },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    title: 'Dashboard'
  },
  // Example of a child route structure if needed later:
  // {
  //   path: 'teams',
  //   canActivate: [AuthGuard],
  //   loadChildren: () => import('./features/teams/teams.routes').then(m => m.TEAM_ROUTES) // Example lazy loading
  // },
  { path: '**', redirectTo: '', pathMatch: 'full' } // Wildcard route for a 404 or redirect to home
];
