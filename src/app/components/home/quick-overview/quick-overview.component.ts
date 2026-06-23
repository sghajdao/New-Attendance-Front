import { Component, OnDestroy, OnInit } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { filter, Subscription } from 'rxjs';
import { InitData } from '../../../models/dto/initData';

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

  ngOnInit(): void {
    const lastUpdate = localStorage.getItem('lastUpdate')
    const initData = localStorage.getItem('init')
    if (!(lastUpdate && new Date().getDate() <= new Date(JSON.parse(lastUpdate)).getDate() && new Date().getMonth() <= new Date(JSON.parse(lastUpdate)).getMonth()) || !initData) {
      this.attendanceService.getInitData().subscribe({
        next: data => {
          if (data) {
            localStorage.removeItem('init')
            localStorage.setItem('init', JSON.stringify(data))
            localStorage.setItem('lastUpdate', JSON.stringify(new Date()))
            const currentData = data.filter(item => item.trmCde === 'SU').at(0)
            if (!data || !data.length) return
            let studentsStop = setInterval(() => {
              this.students++
              if (this.students === currentData?.students.length || currentData?.students.length === 0) clearInterval(studentsStop)
            })
            let coursesStop = setInterval(() => {
              this.courses++
              if (this.courses === currentData?.courses.length || currentData?.courses.length === 0) clearInterval(coursesStop)
            })
            let attendanceRateStop = setInterval(() => {
              this.attendanceRate++
              if (this.attendanceRate === currentData?.attendanceRate || currentData?.attendanceRate === 0) clearInterval(attendanceRateStop)
            })
            let lateArrivalsStop = setInterval(() => {
              if (this.lateArrivals === currentData?.lateArrivals || currentData?.lateArrivals === 0)
                clearInterval(lateArrivalsStop)
              this.lateArrivals++
            })
          }
        }
      })
    }
    else if (initData) {
      if (!initData || !JSON.parse(initData).length) return
      const data: InitData[] = JSON.parse(initData)
      const currentData = data.filter(item => item.trmCde === 'SU').at(0)
      let studentsStop = setInterval(() => {
        this.students++
        if (this.students === currentData?.students.length || currentData?.students.length === 0) clearInterval(studentsStop)
      })
      let coursesStop = setInterval(() => {
        this.courses++
        if (this.courses === currentData?.courses.length || currentData?.courses.length === 0) clearInterval(coursesStop)
      })
      let attendanceRateStop = setInterval(() => {
        this.attendanceRate++
        if (this.attendanceRate === currentData?.attendanceRate || currentData?.attendanceRate === 0) clearInterval(attendanceRateStop)
      })
      let lateArrivalsStop = setInterval(() => {
        if (this.lateArrivals === currentData?.lateArrivals || currentData?.lateArrivals === 0)
          clearInterval(lateArrivalsStop)
        this.lateArrivals++
      })
    }
  }

  ngOnDestroy(): void {
  }
}
