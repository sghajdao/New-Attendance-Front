import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const service = inject(AuthService)
  const router = inject(Router)
  return service.isAuthenticated().pipe(map((res) => {
    if (res) {
      console.log(res)
      localStorage.setItem('email', res.authorities[0].attributes.email)
      if (res.authorities[0].attributes.EmployeeID)
        localStorage.setItem('id', res.authorities[0].attributes.EmployeeID)
      return true
    }
    else {
      router.navigateByUrl('auth')
      return false
    }
  }))
};
