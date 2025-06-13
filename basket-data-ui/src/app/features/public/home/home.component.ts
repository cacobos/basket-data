import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule for routerLink

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule], // Add RouterModule
  template: `
    <div style="text-align: center; padding: 20px;">
      <h2>Welcome to the Basketball Tactical App!</h2>
      <p><a routerLink="/login">Login</a> to get started.</p>
      <p>Or, if you are already logged in, go to your <a routerLink="/dashboard">Dashboard</a>.</p>
    </div>
  `,
})
export class HomeComponent {}
