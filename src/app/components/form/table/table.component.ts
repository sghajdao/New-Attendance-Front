import { AfterViewChecked, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';

@Component({
  selector: 'app-table',
  standalone: false,
  templateUrl: './table.component.html',
  styleUrl: './table.component.css'
})
export class TableComponent implements OnChanges {
  constructor() {}

  @Input() attendance?: Attendance[]
  filteredData?: Attendance[]
  students: number[] = []
  selectedStudent: string = ''
  courses: string[] = []
  selectedCourse: string = ''

  absent: number = 0
  present: number = 0
  late: number = 0

  searchQuery(flag: number) {
    if (this.selectedStudent && this.attendance && flag === 0) {
      console.log(this.selectedStudent)
      this.filteredData = this.attendance.filter(a => a.sis_student_id === +this.selectedStudent)
      this.fillTags(this.filteredData)
    }
    else if (this.selectedCourse && this.attendance && flag === 1) {
      this.filteredData = this.attendance.filter(a => a.sis_course_id === this.selectedCourse)
      this.fillTags(this.filteredData)
    }
    else if (this.attendance) {
        this.filteredData = this.attendance
        this.fillTags(this.filteredData)
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.attendance) {
      new Set(this.attendance.map(a => a.sis_student_id)).forEach(a => this.students.push(a))
      new Set(this.attendance.map(a => a.sis_course_id)).forEach(a => this.courses.push(a))
      this.filteredData = this.attendance
      this.fillTags(this.filteredData)
    }
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
