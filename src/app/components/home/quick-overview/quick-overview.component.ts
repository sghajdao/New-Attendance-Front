import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-quick-overview',
  standalone: false,
  templateUrl: './quick-overview.component.html',
  styleUrl: './quick-overview.component.css'
})
export class QuickOverviewComponent implements OnInit {
  constructor() {}

  students: number = 0
  courses: number = 0
  attendanceRate: number = 0
  lateArrivals: number = 0

  ngOnInit(): void {
    const data = localStorage.getItem('init')
    if (data) {
      this.students = JSON.parse(data).students.length
      this.courses = JSON.parse(data).courses.length
      this.attendanceRate = JSON.parse(data).attendanceRate
      this.lateArrivals = JSON.parse(data).lateArrivals
      console.log(JSON.parse(data))
    }
  }
}
