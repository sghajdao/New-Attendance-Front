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

  private worker: Worker | undefined;

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

  exportReport() {
    if (this.filteredData) {
      const cleanedData = this.filteredData.map(
        ({ id, count, marked_time, ...rest }) => ({
          ...rest,
          marked_at: marked_time || rest.marked_at
        })
      );
      const csvData = this.convertToCsv(cleanedData);

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendanceReport.csv';
      a.click();

      window.URL.revokeObjectURL(url);
    }
  }

  convertToCsv(data: any[]): string {
    if (!data || !data.length) return '';
    const keys = Object.keys(data[0]);

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      if (Array.isArray(value)) {
        // Handle time array [H, M, S] or [Y, M, D, H, M, S]
        if (value.length === 3) {
          const [h, m, s] = value;
          return `"${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}"`;
        }
        if (value.length === 6) {
          const [y, mo, d, h, m, s] = value;
          return `"${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}"`;
        }
      }
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvRows = data.map(row =>
      keys.map(key => formatValue(row[key])).join(',')
    );
    return [keys.join(','), ...csvRows].join('\n');
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
