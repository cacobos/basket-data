import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);

  if (!auth.isConfigured()) {
    return next(req);
  }

  return from(auth.getIdToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      const authenticatedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      return next(authenticatedRequest);
    }),
  );
};
