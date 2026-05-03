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
  major: string;
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
  numberOfStudents: number = 0;

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
        this.numberOfStudents = new Set(this.students.map(s => s.idNum)).size;
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
          this.numberOfStudents = new Set(this.students.map(s => s.idNum)).size;
          localStorage.setItem('lastUpdate', JSON.stringify(new Date()));
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
        console.log('SP26-' + this.students[0].crsCde.replace(/\s/g, ""))
        this.students = this.students.filter(i => this.searchDto?.courses?.includes('SP26-' + i.crsCde.replace(/\s/g, "")))
        this.rawAttendanceData = this.rawAttendanceData.filter(i => this.searchDto?.courses?.includes('SP26-' + i.crsCde.replace(/\s/g, "")))
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
      this.numberOfStudents = new Set(this.students.map(s => s.idNum)).size;
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
          crsDiv: record.crsDiv,
          status: record.status,
          grade: record.grade,
          schedule: record.schedule,
          seniority: record.seniority,
          totalPresences: 0,
          totalAbsences: 0,
          totalLatenesses: 0,
          tempGrade: record.grade,
          gradeChangeDate: record.gradeChangeDate? this.formatDateToYYYYMMDD(record.gradeChangeDate): null,
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          absentLimit: record.absentLimit,
          visaType: record.visaType,
          midtermGrade: record.midtermGrade,
          major: record.major,
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
        group.tempGradeChangeDate = this.formatDateToYYYYMMDD(record.gradeChangeDate);
        group.gradeChangeDate = this.formatDateToYYYYMMDD(record.gradeChangeDate);
      }
    }

    // Clean up temporary fields and return array
    return Array.from(groupMap.values()).map(({ tempGrade, tempGradeChangeDate, ...rest }) => rest);
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

  // Helper methods for severity styling
  getStatusSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
    const statusMap: Record<string, any> = {
      'Active': 'success',
      'Completed': 'info',
      'Dropped': 'warning',
      'Withdrawn': 'danger',
      'Expelled': 'danger',
      'Enrolled': 'contrast',
      'C': 'info'
    };
    return statusMap[status] || 'contrast';
  }

  getGradeSeverity(grade: string | null): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
    if (!grade || grade === '-') return 'contrast';
    if (grade.trim() === 'A' || grade.trim() === 'A-') return 'success';
    if (grade.trim() === 'B' || grade.trim() === 'B+') return 'info';
    if (grade.trim() === 'C' || grade.trim() === 'C+') return 'warning';
    if (grade.trim() === 'D') return 'warning';
    if (grade.trim() === 'F' || grade.trim() === 'WF') return 'danger';
    return 'contrast';
  }

  exportModalToCSV(): void {
    if (!this.modalRecords.length) {
      return;
    }

    const headers = ['Attendance Status', 'Attendance Date', 'Attendance Time'];
    const rows = this.modalRecords.map(record => [
      record.attendance?.toUpperCase() || '',
      this.formatDateToYYYYMMDD(record.attendanceDate),
      record.attendanceTime || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${this.modalTitle.replace(/\s+/g, '_')}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.closeModal();
  }

  formatDateToYYYYMMDD(date: any): string {
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

  /**
   * Exports the currently displayed table data (filtered students) to a CSV file.
   */
  exportToCSV(): void {
    if (!this.students.length) {
      return;
    }

    // Define headers exactly as displayed in the table (order matters)
    const headers = [
      'Student ID', 'Full Name', 'Entrance Year', 'Entrance Term',
      'Division', 'Visa Type', 'Course', 'Status', 'Seniority', 'Grade',
      'Midterm Grade', 'Drop Date', 'Withdraw Date', 'Schedule', 'Level',
      'Professor ID', 'Professor Name', 'Total Presences', 'Total Absences',
      'Total Latenesses', 'Absence Limit', 'Meeting Requests', 'Meetings'
    ];

    // Build rows from the current students array (already filtered)
    const rows = this.students.map(student => {
      // Compute conditional dates based on grade (same logic as in template)
      let dropDate = '-';
      let withdrawDate = '-';
      if (student.grade === 'D' && student.gradeChangeDate) {
        dropDate = this.formatDateToYYYYMMDD(student.gradeChangeDate);
      } else if (student.grade === 'WF' && student.gradeChangeDate) {
        withdrawDate = this.formatDateToYYYYMMDD(student.gradeChangeDate);
      }

      // Escape function for CSV fields
      const escape = (value: any): string => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
      };

      return [
        escape(student.idNum),
        escape(`${student.firstName} ${student.lastName}`),
        escape(student.entanceYr),
        escape(student.entanceTrm),
        escape(student.studentDiv),
        escape(student.visaType),
        escape(student.crsCde),
        escape(student.status),
        escape(student.seniority),
        escape(student.grade || '-'),
        escape(student.midtermGrade || '-'),
        escape(dropDate),
        escape(withdrawDate),
        escape(student.schedule || '-'),
        escape(student.crsDiv),
        escape(student.teacherId),
        escape(student.teacherName),
        escape(student.totalPresences),
        escape(student.totalAbsences),
        escape(student.totalLatenesses),
        escape(student.absentLimit),
        escape(student.meetings.length),
        escape(this.getDoneMeetings(student))
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for UTF-8 encoding to support special characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    const filename = `student_details_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
