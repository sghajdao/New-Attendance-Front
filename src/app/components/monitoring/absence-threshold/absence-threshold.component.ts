import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription } from 'rxjs';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { RedFlagStudents } from '../../../models/dto/reFlagStudent';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';

export interface Student {
  label: string; value: number; color: string; name: string; course: string, seniority: string, id: string, meetings: StudentTracking[]
}

@Component({
  selector: 'app-absence-threshold',
  standalone: false,
  templateUrl: './absence-threshold.component.html',
  styleUrl: './absence-threshold.component.css'
})
export class AbsenceThresholdComponent implements OnInit, OnDestroy, OnChanges {
  constructor(
    private attendanceService: AttendanceService,
  ) { }

  @Input() searchDto?: SearchDto
  students: Student[] = [];
  studentsBackup: Student[] = [];
  subscriptions: Subscription[] = [];
  loading: boolean = false

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 0;
  pageSizeOptions: number[] = [6, 12, 18];

  get paginatedStudents(): typeof this.students {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.students.slice(start, end);
  }

  ngOnInit(): void {
    this.loading = true
    const sub = this.attendanceService.getRedFlagStudents().subscribe({
      next: (res) => {
        this.students = res.map((student: RedFlagStudents) => ({
          label: `Absences: ${student.count} / ${student.absentLimit}`,
          value: +((student.count / student.absentLimit) * 100).toFixed(2),
          color: student.count >= student.absentLimit ? 'red' : 'black',
          name: `${student.firstName} ${student.lastName}`,
          course: `${student.course_sis_id}`,
          seniority: student.seniority,
          id: student.student_sis_id,
          meetings: student.meetings
        }));
        this.studentsBackup = [...this.students];
        this.updatePagination();
        this.loading = false
      },
      error: (err) => {
        console.error(err);
        this.loading = false
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto && this.students.length) {
      if (this.searchDto.studentIds?.length)
        this.students = this.studentsBackup.filter(student => this.searchDto?.studentIds?.includes(student.id))
      if (this.searchDto.courses?.length)
        this.students = this.students.filter(student => this.searchDto?.courses?.includes(student.course))
      if (this.searchDto.seniorities?.length)
        this.students = this.students.filter(student => this.searchDto?.seniorities?.includes(student.seniority))
      else if (!this.searchDto.studentIds?.length && !this.searchDto.courses?.length && !this.searchDto.seniorities?.length)
        this.students = this.studentsBackup;
      
      // Reset to first page whenever filters change
      this.currentPage = 1;
      this.updatePagination();
    }
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.students.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onPageChange(event: any): void {
    this.currentPage = (event.first / event.rows) + 1;
    this.pageSize = event.rows;
    // No need to slice manually – paginatedStudents getter will recompute
  }

  getInitials(name: string): string {
      if (!name) return '?';
      return name.split(' ')
          .map(part => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  }

  formatSeniority(seniority: string): string {
      const seniorityMap: Record<string, string> = {
          'FR': 'Freshman',
          'SO': 'Sophomore', 
          'JR': 'Junior',
          'SR': 'Senior',
          'GR': 'Graduate'
      };
      return seniorityMap[seniority] || seniority;
  }

  getThresholdSeverity(value: number): 'success' | 'warning' | 'danger' | 'info' {
      if (value >= 75) return 'danger';
      if (value >= 50) return 'warning';
      return 'info';
  }

  getRiskClass(value: number): string {
      if (value >= 75) return 'high-risk';
      if (value >= 60) return 'medium-risk';
      return 'low-risk';
  }

  getProgressClass(value: number): string {
      if (value >= 75) return 'high';
      if (value >= 50) return 'medium';
      return 'low';
  }

  getAverageThreshold(): number {
      if (!this.students.length) return 0;
      const sum = this.students.reduce((acc, s) => acc + s.value, 0);
      return Math.round(sum / this.students.length);
  }

  getCriticalCount(): number {
      return this.students.filter(s => s.value >= 75).length;
  }

  hasPendingMeeting(student: Student) {
    for (let item of student.meetings) {
      if (!item.comment || !item.comment.trim.length)
        return true;
    }
    return false
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
