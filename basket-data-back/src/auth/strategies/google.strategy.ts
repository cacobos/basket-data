import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID, // Placeholder
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Placeholder
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback', // Placeholder
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const user = await this.authService.validateUser({
        googleId: profile.id,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
        displayName: profile.displayName,
        firstName: profile.name && profile.name.givenName ? profile.name.givenName : null,
        lastName: profile.name && profile.name.familyName ? profile.name.familyName : null,
        picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
}
