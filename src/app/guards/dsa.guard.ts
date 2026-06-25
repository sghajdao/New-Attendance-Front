import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';
import { inject } from '@angular/core';

export const dsaGuard: CanActivateFn = (route, state) => {
  const service = inject(AuthService)
  const router = inject(Router)
  return service.isAuthenticated().pipe(map((res) => {
    if (res) {
      localStorage.setItem('email', res.authorities[0].attributes.email)
      if (res.authorities[0].attributes.EmployeeID)
        localStorage.setItem('id', res.authorities[0].attributes.EmployeeID)
      if (res.authorities[0].attributes.email === 'Y.Akhoubi@aui.ma' || res.authorities[0].attributes.email === 'S.Ghajdaoui@aui.ma' || res.authorities[0].attributes.email === 'A.Bettahi@aui.ma')
        return true
      else {
        router.navigateByUrl('home')
        return false
      }
    }
    else {
      router.navigateByUrl('auth')
      return false
    }
  }))
};
