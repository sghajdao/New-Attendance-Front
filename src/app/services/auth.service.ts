import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
  ) { }

  isAuthenticated() {
    return this.http.get<any>(environment.authUrl);
  }

  setCookie() {
    return this.http.get<boolean>(environment.cookietUrl)
  }

  logout() {
    return this.http.get<any>(environment.logoutUrl);
  }
}
