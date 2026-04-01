import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { JWTPayload } from 'jose';

interface FirebaseJwtPayload extends JWTPayload {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  firebase?: {
    sign_in_provider?: string;
  };
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly firebaseProjectId =
    process.env.FIREBASE_PROJECT_ID?.trim() || 'basket-coach-1cdd5';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      query?: Record<string, string | undefined>;
      user?: FirebaseJwtPayload;
    }>();

    const token = this.extractToken(request.headers, request.query);
    if (!token) {
      throw new UnauthorizedException('Token de autenticacion no proporcionado.');
    }

    const payload = await this.verifyIdToken(token);
    const provider = payload.firebase?.sign_in_provider;
    const isEmailVerified = provider === 'google.com' || payload.email_verified === true;

    if (!isEmailVerified) {
      throw new UnauthorizedException('Debes verificar tu correo antes de usar la aplicacion.');
    }

    request.user = payload;
    return true;
  }

  private extractToken(
    headers: Record<string, string | string[] | undefined>,
    query?: Record<string, string | undefined>,
  ): string | null {
    const authHeader = headers['authorization'];
    const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (authValue?.startsWith('Bearer ')) {
      return authValue.slice(7).trim();
    }

    const queryToken = query?.authToken?.trim();
    return queryToken || null;
  }

  private async verifyIdToken(token: string): Promise<FirebaseJwtPayload> {
    try {
      const { createRemoteJWKSet, jwtVerify } = await import('jose');
      const jwks = createRemoteJWKSet(
        new URL(
          'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
        ),
      );
      const issuer = `https://securetoken.google.com/${this.firebaseProjectId}`;
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: this.firebaseProjectId,
      });
      return payload as FirebaseJwtPayload;
    } catch {
      throw new UnauthorizedException('Token Firebase invalido o expirado.');
    }
  }
}
