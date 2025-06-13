import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment'; // Import environment

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'authToken';
  private apiUrl = environment.apiUrl; // Use environment variable

  constructor(private router: Router) { }

  login(): void {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  handleLoginSuccess(token: string): void {
    this.saveToken(token);
    // Optionally decode token to get user info & store it
    // const decodedToken = this.decodeToken(token);
    // if (decodedToken) { this.saveUser(decodedToken); }
    this.router.navigate(['/dashboard']); // Or a default authenticated route
  }

  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    // Basic check: token exists.
    // Add token expiration check for production readiness (e.g., using jwt-decode library)
    // For now, presence implies authenticated.
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    // localStorage.removeItem(this.userKey); // If user info is stored
    this.router.navigate(['/login']); // Or home page
  }

  // Optional: Method to decode token if needed on frontend
  // private decodeToken(token: string): any {
  //   try {
  //     // Use jwt-decode or similar library if available
  //     // import jwt_decode from 'jwt-decode'; // Would need to install
  //     // return jwt_decode(token);
  //     // Basic, less safe decoding for demonstration:
  //     const payload = token.split('.')[1];
  //     if (!payload) return null;
  //     return JSON.parse(atob(payload));
  //   } catch (Error) {
  //     console.error("Error decoding token", Error);
  //     return null;
  //   }
  // }
}
