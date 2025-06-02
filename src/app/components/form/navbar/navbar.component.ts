import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FilrterRequest } from '../../../models/dto/filterRequest';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription } from 'rxjs';
import { Attendance } from '../../../models/entities/attendance';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
  ) {}

  @Input() filter?: FilrterRequest
  @Output() attendance = new EventEmitter<Attendance[]>()

  toExport?: Attendance[]

  subsciptions: Subscription[] = []

  applyFilters() {
    if (this.filter) {
      const sub = this.attendanceService.filterAttendance(this.filter).subscribe({
        next: data => {
          this.attendance.emit(data)
          this.toExport = data
        }
      })
      this.subsciptions.push(sub)
    }
  }

  convertToCsv(data: any[]): string {
    if (!data || !data.length) {
      return '';
    }

    const keys = Object.keys(data[0]);
    const csvContent = data.map(row => {
      return keys.map(key => row[key]).join(',');
    });

    return [keys.join(','), ...csvContent].join('\n');
  }

  exportReport() {
    if (this.toExport) {
      let report: Attendance[] = []
      for (let a of this.toExport) {
        let item: Attendance = {
          sis_student_id: a.sis_student_id,
          sis_course_id: a.sis_course_id,
          attendance: a.attendance,
          count: this.toExport.filter(i => i.sis_student_id === a.sis_student_id && i.sis_course_id === a.sis_course_id && i.attendance === a.attendance).length,
          current_class_cde: a.current_class_cde,
          sis_teacher_id: a.sis_teacher_id,
          course_code: a.course_code,
          teacher_name: a.teacher_name
        }
        if (!report.filter(i => i.sis_student_id === item.sis_student_id && i.sis_course_id === item.sis_course_id && i.attendance === item.attendance).length)
          report.push(item)
      }
      const csvData = this.convertToCsv(report.map(({ class_date, ...item }) => item))
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendanceReport.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  ngOnDestroy(): void {
    this.subsciptions.forEach(sub => sub.unsubscribe())
  }
}
