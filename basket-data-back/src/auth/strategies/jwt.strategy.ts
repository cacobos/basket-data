import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service'; // May not be needed if only validating payload

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // private readonly authService: AuthService, // Uncomment if you need to fetch user from DB
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret', // Same secret as in JwtModule
    });
  }

  async validate(payload: any) {
    // The payload is the decoded JWT.
    // Passport will build a user object based on the return value of this method,
    // and attach it as req.user
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    // You could fetch the full user object from the database here if needed:
    // const user = await this.authService.findUserById(payload.sub);
    // if (!user) {
    //   throw new UnauthorizedException('User not found');
    // }
    // For now, just returning the essential parts from the payload.
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
