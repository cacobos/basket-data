import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss']
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Assuming backend redirects to /auth/callback?token=YOUR_JWT
    const token = this.route.snapshot.queryParams['token'];
    if (token) {
      this.authService.handleLoginSuccess(token);
    } else {
      // Handle error or missing token - redirect to login
      console.error('Token not found in callback URL');
      this.router.navigate(['/login']);
    }
  }
}
