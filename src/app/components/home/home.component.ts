import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  constructor(
    private authService: AuthService,
  ) {}

  accessMonitoring: boolean = false;

  ngOnInit(): void {
    const email = localStorage.getItem('email');
    if (email && (email === 'D.Chayabaynou@aui.ma' || email === 'S.Ghajdaoui@aui.ma' || email === 'A.Bettahi@aui.ma'))
      this.accessMonitoring = true;
  }
}
