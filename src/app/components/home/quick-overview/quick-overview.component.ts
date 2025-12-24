import { Component, OnDestroy, OnInit } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quick-overview',
  standalone: false,
  templateUrl: './quick-overview.component.html',
  styleUrl: './quick-overview.component.css'
})
export class QuickOverviewComponent implements OnInit, OnDestroy {
  constructor(
    private attendanceService: AttendanceService
  ) {}

  students: number = 0
  courses: number = 0
  attendanceRate: number = 0
  lateArrivals: number = 0

  sub?: Subscription

  ngOnInit(): void {
    const lastUpdate = localStorage.getItem('lastUpdate')
    const initData = localStorage.getItem('init')
    if (!(lastUpdate && new Date().getDate() <= new Date(JSON.parse(lastUpdate)).getDate() && new Date().getMonth() <= new Date(JSON.parse(lastUpdate)).getMonth()) || !initData) {
      this.sub = this.attendanceService.getInitData().subscribe({
        next: data => {
          if (data) {
            localStorage.setItem('init', JSON.stringify(data))
            localStorage.setItem('lastUpdate', JSON.stringify(new Date()))
            // this.students = data.students.length
            // this.courses = data.courses.length
            // this.attendanceRate = data.attendanceRate
            // this.lateArrivals = data.lateArrivals
            let studentsStop = setInterval(() => {
              this.students++
              if (this.students === data.students.length) clearInterval(studentsStop)
            })
            let coursesStop = setInterval(() => {
              this.courses++
              if (this.courses === data.courses.length) clearInterval(coursesStop)
            })
            let attendanceRateStop = setInterval(() => {
              this.attendanceRate++
              if (this.attendanceRate === data.attendanceRate) clearInterval(attendanceRateStop)
            })
            let lateArrivalsStop = setInterval(() => {
              this.lateArrivals++
              if (this.lateArrivals === data.lateArrivals) clearInterval(lateArrivalsStop)
            })
          }
        }
      })
    }
    else if (initData) {
      let studentsStop = setInterval(() => {
        this.students++
        if (this.students === JSON.parse(initData).students.length) clearInterval(studentsStop)
      })
      let coursesStop = setInterval(() => {
        this.courses++
        if (this.courses === JSON.parse(initData).courses.length) clearInterval(coursesStop)
      })
      let attendanceRateStop = setInterval(() => {
        this.attendanceRate++
        if (this.attendanceRate === JSON.parse(initData).attendanceRate) clearInterval(attendanceRateStop)
      })
      let lateArrivalsStop = setInterval(() => {
        this.lateArrivals++
        if (this.lateArrivals === JSON.parse(initData).lateArrivals) clearInterval(lateArrivalsStop)
      })
      // this.students = JSON.parse(initData).students.length
      // this.courses = JSON.parse(initData).courses.length
      // this.attendanceRate = JSON.parse(initData).attendanceRate
      // this.lateArrivals = JSON.parse(initData).lateArrivals
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }
}
