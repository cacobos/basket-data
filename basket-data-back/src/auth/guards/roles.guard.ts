import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserDocument } from '../schemas/user.schema'; // Assuming user object structure

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles specified, access granted
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserDocument; // Or your specific user type from JWT payload

    if (!user || !user.roles) {
      return false; // No user or no roles attached to user, access denied
    }

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
