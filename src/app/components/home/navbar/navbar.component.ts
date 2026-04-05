import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private authService: AuthService,
  ) {}

  openDialog(event: Event) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Are you sure that you want to sign out?',
        header: 'Confirmation',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true,
        },
        acceptButtonProps: {
            label: 'Sign out',
            severity: 'contrast'
        },
        accept: () => {
            this.logout()
        },
        reject: () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Rejected',
                detail: 'You have rejected',
                life: 3000,
            });
        },
    });
  }

  logout() {
    // window.location.href = "https://login.microsoftonline.com/7025e04c-70ca-48bf-ab7b-73954cb846ad/oauth2/v2.0/logout?post_logout_redirect_uri=https://attendance.aui.ma/";
    // localStorage.clear();
    // sessionStorage.clear();
    // this.cookieService.delete('JSESSIONID', '/', undefined, true, 'Strict');
    // document.cookie = "JSESSIONID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict;";
    // this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'You have signed out' })
    window.location.href = 'https://attendance.aui.ma/logout'
  }
}
