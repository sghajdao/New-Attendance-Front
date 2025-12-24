import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: false,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private location: Location,
    private router: Router,
  ) {}

  authenticated: boolean = false

  ngOnInit(): void {
    const sub = this.authService.isAuthenticated().subscribe({
      next: res => this.authenticated = (res !== null)
    })
  }

  login() {
    if (!this.authenticated) {
      this.location.go('/auth/init')
      window.location.reload()
    }
    else {
      window.location.href = "https://login.microsoftonline.com/7025e04c-70ca-48bf-ab7b-73954cb846ad/oauth2/v2.0/logout?post_logout_redirect_uri=https://attendance.aui.ma/";
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = "JSESSIONID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict;";
    }
  }
}
