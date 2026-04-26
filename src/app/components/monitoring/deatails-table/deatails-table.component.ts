// deatails-table.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';

// Aggregated row per student + course
export interface StudentCourseAggregate {
  idNum: string;
  firstName: string;
  lastName: string;
  entanceYr: string;
  entanceTrm: string;
  visaType: string;
  studentDiv: string;
  crsCde: string;
  courseSisId: string;
  crsDiv: string;
  status: string;
  grade: string | null;
  gradeChangeDate: string | null;
  schedule: string | null;
  seniority: string;
  teacherId: string;
  teacherName: string;
  totalPresences: number;
  totalAbsences: number;
  totalLatenesses: number;
  absentLimit: number;
  midtermGrade: string;
  meetings: StudentTracking[];
}

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() searchDto?: SearchDto;
  subscriptions: Subscription[] = [];

  // Raw attendance data from API/IndexedDB
  rawAttendanceData: StudentAttendanceDetails[] = [];
  backup: StudentAttendanceDetails[] = [];
  // Aggregated data for table display
  students: StudentCourseAggregate[] = [];

  // Modal properties
  showModal = false;
  modalRecords: StudentAttendanceDetails[] = [];
  modalTitle = '';

  constructor(
    private attendanceService: AttendanceService,
    private indexeddbService: IndexeddbService
  ) {}

  ngOnInit(): void {
    const lastUpdate = localStorage.getItem('lastUpdate');
    const initData = localStorage.getItem('init');
    const shouldFetch = !(lastUpdate && new Date().getDate() <= new Date(JSON.parse(lastUpdate)).getDate() && new Date().getMonth() <= new Date(JSON.parse(lastUpdate)).getMonth()) || !initData;

    let dataExists: boolean = false
    if (!shouldFetch) {
      this.indexeddbService.getData('info').then((data: StudentAttendanceDetails[]) => {
        dataExists = data && data.length? true : false
        console.log('Loaded from IndexedDB:', data);
        this.rawAttendanceData = data;
        this.students = this.buildAggregatedData(data);
      });
    }
    if (shouldFetch || ! dataExists) {
      const sub = this.attendanceService.getStudentsInfo().subscribe({
        next: (res: StudentAttendanceDetails[]) => {
          console.log('Fetched raw records:', res.length);
          this.indexeddbService.clearData('info');
          this.indexeddbService.addData(res, 'info');
          this.rawAttendanceData = res;
          this.backup = res;
          this.students = this.buildAggregatedData(res);
        },
        error: (err) => {
          console.error(err);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto) {
      if (this.searchDto.courses && this.searchDto.courses.length) {
        this.students = this.students.filter(i => this.searchDto?.courses?.includes(i.courseSisId))
        this.rawAttendanceData = this.rawAttendanceData.filter(i => this.searchDto?.courses?.includes(i.courseSisId))
      }
      if (this.searchDto.seniorities && this.searchDto.seniorities.length) {
        this.students = this.students.filter(i => this.searchDto?.seniorities?.includes(i.seniority))
        this.rawAttendanceData = this.rawAttendanceData.filter(i => this.searchDto?.seniorities?.includes(i.seniority))
      }
      if (this.searchDto.studentIds && this.searchDto.studentIds.length) {
        this.students = this.students.filter(i => this.searchDto?.studentIds?.includes(i.idNum))
        this.rawAttendanceData = this.rawAttendanceData.filter(i => this.searchDto?.studentIds?.includes(i.idNum))
      }
      else if (!this.searchDto.studentIds?.length && !this.searchDto.courses?.length && !this.searchDto.seniorities?.length) {
        this.students = this.buildAggregatedData(this.backup)
        this.rawAttendanceData = this.backup
      }
    }
  }

  /**
   * Groups raw attendance records by student ID + course code,
   * counts attendance types, and returns aggregated rows.
   */
  private buildAggregatedData(records: StudentAttendanceDetails[]): StudentCourseAggregate[] {
    const groupMap = new Map<string, StudentCourseAggregate & { tempGrade?: string | null; tempGradeChangeDate?: string | null }>();

    for (const record of records) {
      const key = `${record.idNum}|${record.crsCde}`;
      if (!groupMap.has(key)) {
        // Initialize with first occurrence's student & course data
        groupMap.set(key, {
          idNum: record.idNum,
          firstName: record.firstName,
          lastName: record.lastName,
          entanceYr: record.entanceYr,
          entanceTrm: record.entanceTrm,
          studentDiv: record.studentDiv,
          crsCde: record.crsCde,
          courseSisId: record.courseSisId,
          crsDiv: record.crsDiv,
          status: record.status,
          grade: record.grade,
          schedule: record.schedule,
          seniority: record.seniority,
          totalPresences: 0,
          totalAbsences: 0,
          totalLatenesses: 0,
          tempGrade: record.grade,
          gradeChangeDate: this.formatDateToDDMMYYY(record.gradeChangeDate),
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          absentLimit: record.absentLimit,
          visaType: record.visaType,
          midtermGrade: record.midtermGrade,
          meetings: record.meetings || []
        });
      }

      const group = groupMap.get(key)!;
      // Count attendance types
      switch (record.attendance) {
        case 'present':
          group.totalPresences++;
          break;
        case 'absent':
          group.totalAbsences++;
          break;
        case 'late':
          group.totalLatenesses++;
          break;
      }

      // Prefer non-null grade/gradeChangeDate if available in any record of the group
      if (record.grade && !group.tempGrade) {
        group.tempGrade = record.grade;
        group.grade = record.grade;
      }
      if (record.gradeChangeDate && !group.tempGradeChangeDate) {
        group.tempGradeChangeDate = this.formatDateToDDMMYYY(record.gradeChangeDate);
        group.gradeChangeDate = this.formatDateToDDMMYYY(record.gradeChangeDate);
      }
    }

    // Clean up temporary fields and return array
    return Array.from(groupMap.values()).map(({ tempGrade, tempGradeChangeDate, ...rest }) => rest);
  }

  formatDateToDDMMYYY(date: Date): string {
    date = new Date(date)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
  
    return `${day}-${month}-${year}`;
  }

  /**
   * Called when a table row is clicked.
   * Filters raw attendance records by student ID and course code,
   * then opens modal with the list.
   */
  onRowClick(row: StudentCourseAggregate): void {
    const filtered = this.rawAttendanceData.filter(
      record => record.idNum === row.idNum && record.crsCde === row.crsCde
    );
    // Sort by attendanceDate descending (newest first)
    const sorted = [...filtered].sort((a, b) => 
      new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime()
    );
    this.modalRecords = sorted;
    this.modalTitle = `${row.firstName} ${row.lastName} - ${row.crsCde}`;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalRecords = [];
  }

  // Helper methods for severity styling (unchanged from original)
  getStatusSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
    const statusMap: Record<string, any> = {
      'Active': 'success',
      'Completed': 'info',
      'Dropped': 'warning',
      'Withdrawn': 'danger',
      'Expelled': 'danger',
      'Enrolled': 'contrast',
      'C': 'info' // map 'C' (completed) to info
    };
    return statusMap[status] || 'contrast';
  }

  getGradeSeverity(grade: string | null): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
    if (!grade || grade === '-') return 'contrast';
    if (grade === 'A' || grade === 'A-') return 'success';
    if (grade === 'B' || grade === 'B+') return 'info';
    if (grade === 'C' || grade === 'C+') return 'warning';
    if (grade === 'D') return 'warning';
    if (grade === 'F' || grade === 'WF') return 'danger';
    return 'contrast';
  }

  exportModalToCSV(): void {
    if (!this.modalRecords.length) {
      // Optionally show a brief notification or silently ignore
      return;
    }

    // Define CSV headers and field mappings
    const headers = ['Attendance Status', 'Attendance Date', 'Attendance Time'];
    const rows = this.modalRecords.map(record => [
      record.attendance?.toUpperCase() || '',
      this.formatDateToYYYYMMDD(record.attendanceDate),
      record.attendanceTime || ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${this.modalTitle.replace(/\s+/g, '_')}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper methods for consistent date/time formatting
  private formatDateToYYYYMMDD(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDoneMeetings(student: StudentCourseAggregate) {
    return student.meetings.filter(m => m.comment && m.comment.trim() !== '').length;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
