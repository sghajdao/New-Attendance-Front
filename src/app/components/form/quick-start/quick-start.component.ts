import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { InitData } from '../../../models/dto/initData';

@Component({
  selector: 'app-quick-start',
  standalone: false,
  templateUrl: './quick-start.component.html',
  styleUrl: './quick-start.component.css'
})
export class QuickStartComponent implements OnInit{
  constructor() {}

  students: number = 0
  courses: number = 0
  attendanceRecords: number = 0

  ngOnInit(): void {
    const data = localStorage.getItem('init')
    if (data) {
      const currentData: InitData = JSON.parse(data).filter((item: InitData) => item.trmCde === 'SI').at(0)!
      this.students = currentData.students.length
      this.courses = currentData.courses.length
      this.attendanceRecords = currentData.attendanceRate
    }
  }
}
