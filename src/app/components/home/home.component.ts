import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    constructor(
        private router: Router,
        private attendanceService: AttendanceService
    ) {}

    ngOnInit(): void {
      this.attendanceService.getInitData().subscribe({
        next: data => localStorage.setItem('init', JSON.stringify(data))
      })
    }
}
