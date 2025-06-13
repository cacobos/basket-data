import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service'; // Corrected path based on actual structure
import { Router } from '@angular/router'; // For navigation if needed, though logout handles it

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  // userEmail: string | null = null; // For displaying user email later

  constructor(
    public authService: AuthService, // Made public for template access
    private router: Router // Kept router in case of future direct navigation needs
  ) {
    // Example: If you wanted to get user info on init or reactively
    // this.authService.currentUserObservable.subscribe(user => {
    //   this.userEmail = user ? user.email : null;
    // });
  }

  onLogout(): void {
    this.authService.logout();
    // The authService.logout() method already handles navigation to '/login'.
    // If it didn't, you would navigate here:
    // this.router.navigate(['/login']);
  }
}
