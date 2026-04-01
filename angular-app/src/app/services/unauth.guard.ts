import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const unauthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.loading()) {
    return true;
  }

  if (auth.canUseApp()) {
    return router.createUrlTree(['/analyzer']);
  }

  return true;
};
