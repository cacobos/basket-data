import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import { User, UserDocument } from './schemas/user.schema';

interface GoogleProfile {
  googleId: string;
  email: string | null;
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  picture?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService, // Inject JwtService
  ) {}

  async validateUser(profile: GoogleProfile): Promise<UserDocument> {
    if (!profile.googleId) {
      throw new UnauthorizedException('Google ID not provided in profile.');
    }
    if (!profile.email) {
      // Depending on requirements, you might allow users without emails
      // or handle this case differently (e.g., assign a placeholder email).
      // For this example, we'll consider email mandatory from Google.
      throw new UnauthorizedException('Email not provided in Google profile.');
    }

    let user = await this.userModel.findOne({ googleId: profile.googleId }).exec();

    if (user) {
      // Optionally update user details if they've changed in Google
      // For example: user.displayName = profile.displayName;
      // await user.save();
      return user;
    }

    // If user does not exist, create a new one
    user = new this.userModel({
      googleId: profile.googleId,
      email: profile.email,
      displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User',
      // roles will default to ['user'] as per schema
    });

    try {
      await user.save();
      return user;
    } catch (error) {
      // Handle potential save errors, e.g., if email uniqueness is violated by another user
      // (though googleId should be the primary unique factor here for Google auth)
      throw new UnauthorizedException('Could not save new user information.', error.toString());
    }
  }

  async login(user: UserDocument): Promise<{ access_token: string }> {
    const payload = {
      email: user.email,
      sub: user._id.toString(), // mongoose _id is an ObjectId, convert to string
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
