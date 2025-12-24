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
      this.students = JSON.parse(data).students.length
      this.courses = JSON.parse(data).courses.length
      this.attendanceRecords = JSON.parse(data).attendanceRate
    }
  }
}
