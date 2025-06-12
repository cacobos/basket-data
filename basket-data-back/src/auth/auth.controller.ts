import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UserDocument } from './schemas/user.schema'; // Import UserDocument
import { Roles } from './decorators/roles.decorator'; // Import Roles decorator
import { RolesGuard } from './guards/roles.guard'; // Import RolesGuard

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Initiates the Google OAuth2 login flow through the guard
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req: { user: UserDocument }) { // Typed req.user
    // req.user is populated by Passport from the GoogleStrategy's validate() method
    // Now, pass it to the AuthService to get a JWT
    return this.authService.login(req.user);
  }

  @Get('admin-test')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Apply AuthGuard first, then RolesGuard
  @Roles('admin') // Specify that only 'admin' role can access
  async adminTest() {
    return 'Admin test successful';
  }
}
