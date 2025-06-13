import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { AuthService } from '../../../core/services/auth.service'; // For potential user info display

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h2>Dashboard</h2>
      <p>Welcome, authenticated user!</p>
      <p>This is your main dashboard area once logged in.</p>
      <!-- Content for dashboard will go here -->
    </div>
  `,
})
export class DashboardComponent {
  // constructor(private authService: AuthService) {} // If displaying user info
}
