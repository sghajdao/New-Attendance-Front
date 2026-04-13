// deatails-table.component.ts
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';

// Raw attendance record from API
interface RawAttendanceRecord {
  idNum: string;
  firstName: string;
  lastName: string;
  crsCde: string;
  yrCde: string;
  trmCde: string;
  crsDiv: string;
  studentDiv: string;
  status: string;
  grade: string | null;
  gradeChangeDate: string | null;
  schedule: string | null;
  entanceYr: string;
  entanceTrm: string;
  visaType: string;
  seniority: string;
  attendance: 'present' | 'absent' | 'late';
  attendanceDate: string;
  teacherId: string;
  teacherName: string;
}

// Aggregated row per student + course
export interface StudentCourseAggregate {
  idNum: string;
  firstName: string;
  lastName: string;
  entanceYr: string;
  studentDiv: string;
  crsCde: string;
  crsDiv: string;
  status: string;
  grade: string | null;
  gradeChangeDate: string | null;
  schedule: string | null;
  seniority: string;
  totalPresences: number;
  totalAbsences: number;
  totalLatenesses: number;
}

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnDestroy {
  @Input() searchDto?: any; // kept for future filtering
  subscriptions: Subscription[] = [];

  // Raw attendance data from API/IndexedDB
  rawAttendanceData: StudentAttendanceDetails[] = [];
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

    if (shouldFetch) {
      const sub = this.attendanceService.getStudentsInfo().subscribe({
        next: (res: StudentAttendanceDetails[]) => {
          console.log('Fetched raw records:', res.length);
          this.indexeddbService.clearData('info');
          this.indexeddbService.addData(res, 'info');
          this.rawAttendanceData = res;
          this.students = this.buildAggregatedData(res);
        },
        error: (err) => {
          console.error(err);
        }
      });
      this.subscriptions.push(sub);
    } else {
      this.indexeddbService.getData('info').then((data: StudentAttendanceDetails[]) => {
        console.log('Loaded from IndexedDB:', data.length);
        this.rawAttendanceData = data;
        this.students = this.buildAggregatedData(data);
      });
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
          studentDiv: record.studentDiv,
          crsCde: record.crsCde,
          crsDiv: record.crsDiv,
          status: record.status,
          grade: record.grade,
          schedule: record.schedule,
          seniority: record.seniority,
          totalPresences: 0,
          totalAbsences: 0,
          totalLatenesses: 0,
          tempGrade: record.grade,
          gradeChangeDate: this.formatDateToDDMMYYY(record.gradeChangeDate)
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

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
