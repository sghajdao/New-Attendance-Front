import { Component, OnInit } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';

@Component({
  selector: 'app-table',
  standalone: false,
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent implements OnInit {
  constructor(
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit(): void {
    this.attendanceService.attendance$.subscribe(data => {
      this.attendance = data
        this.students = []
        this.courses = []
        this.attendanceTypes = []
        new Set(data.map(a => a.student_sis_id)).forEach(a => this.students.push(a))
        new Set(data.map(a => a.course_sis_id)).forEach(a => this.courses.push(a))
        new Set(data.map(a => a.attendance)).forEach(a => this.attendanceTypes.push(a))
        this.filteredData = data
        this.fillTags(this.filteredData!)
    })
  }

  attendance?: Attendance[]
  filteredData?: Attendance[]
  students: string[] = []
  selectedStudent: string = ''
  courses: string[] = []
  selectedCourse: string = ''
  attendanceTypes: string[] = []
  selectedAttenanceType: string = ''

  absent: number = 0
  present: number = 0
  late: number = 0

  searchQuery(flag: number) {
    // Start with the original attendance data
    let filtered = this.attendance ? [...this.attendance] : [];
    
    if (this.selectedStudent) {
      filtered = filtered.filter(a => a.student_sis_id === this.selectedStudent);
    }
    
    if (this.selectedAttenanceType) {
      filtered = filtered.filter(a => a.attendance === this.selectedAttenanceType);
    }
    
    if (this.selectedCourse) {
      filtered = filtered.filter(a => a.course_sis_id === this.selectedCourse);
    }
    
    this.filteredData = filtered;
    
    this.fillTags(this.filteredData);
  }

  fillTags(data: Attendance[]) {
    this.present = data.filter(a => a.attendance === 'present').length
    this.absent = data.filter(a => a.attendance === 'absent').length
    this.late = data.filter(a => a.attendance === 'late').length
  }

  formatDate(date: string): string {
    const parsedDate = new Date(date);
  
    // Check if the date is valid
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid time value");
    }
  
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short', // 'Tue'
      day: '2-digit',   // '03'
      month: 'short',   // 'Sep'
      year: 'numeric',  // '2024'
    };
    return new Intl.DateTimeFormat('en-US', options).format(parsedDate);
  }
}
