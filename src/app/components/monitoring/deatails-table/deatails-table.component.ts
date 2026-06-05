// deatails-table.component.ts
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { catchError, concatMap, EMPTY, forkJoin, from, Subscription, switchMap, tap } from 'rxjs';
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
  schoolCde: string;
  crsDiv: string;
  trmCde: string;
  yrCde: string;
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
  faculty: string;
  hold: string;
  trmGpa: string;
  wfReason: string;
  meetings: StudentTracking[];
}

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnDestroy {
  @Input() searchDto?: SearchDto;
  subscriptions: Subscription[] = [];

  // Raw attendance data from API/IndexedDB
  rawAttendanceData: StudentAttendanceDetails[] = [];
  backup: StudentAttendanceDetails[] = [];
  // Aggregated data for table display
  students: StudentCourseAggregate[] = [];
  numberOfStudents: number = 0;

  // Loading spinner state
  isLoading: boolean = false;

  // Modal properties
  showModal = false;
  modalRecords: StudentAttendanceDetails[] = [];
  modalTitle = '';

  constructor(
    private attendanceService: AttendanceService,
    private indexeddbService: IndexeddbService
  ) {}

  ngOnInit(): void {
    this.fetchData();

    const sub = this.attendanceService.attendanceFilter$
      .pipe(
      
        tap(filter => {
          console.log('Received filter update in DetailsTableComponent:', filter);
          this.isLoading = true;
        }),
      
        switchMap(filter => {
        
          const term = filter.trmCde || 'SU';
        
          return from(
            this.indexeddbService.getData(term)
          ).pipe(
          
            tap((data: StudentAttendanceDetails[]) => {
            
              this.backup = data;
            
              // Convert arrays to Sets for fast lookup
              const coursesSet = new Set(
                filter.courses?.map(c => c.trim())
              );
            
              const senioritiesSet = new Set(
                filter.seniorities
              );
            
              const studentIdsSet = new Set(
                filter.studentIds
              );
            
              let filteredRawData = data;
            
              // Apply filters only if needed
              if (coursesSet.size) {
                filteredRawData = filteredRawData.filter(i =>
                  coursesSet.has(
                    'SU26-' + i.crsCde.replace(/\s/g, '')
                  )
                );
              }
            
              if (senioritiesSet.size) {
                filteredRawData = filteredRawData.filter(i =>
                  senioritiesSet.has(i.seniority)
                );
              }
            
              if (studentIdsSet.size) {
                filteredRawData = filteredRawData.filter(i =>
                  studentIdsSet.has(i.idNum)
                );
              }
            
              this.rawAttendanceData = filteredRawData;
            
              this.students =
                this.buildAggregatedData(filteredRawData);
            
              this.numberOfStudents =
                new Set(this.students.map(s => s.idNum)).size;
            
              this.isLoading = false;
            }),
          
            catchError(err => {
              console.error('Error loading term data:', err);
              this.isLoading = false;
              return EMPTY;
            })
          
          );
        })
      
      )
      .subscribe();
    
    this.subscriptions.push(sub);
  }

  fetchData() {
    const lastUpdate = localStorage.getItem('trackLastUpdate');
    const initData = localStorage.getItem('init');
    let shouldFetch = !(lastUpdate && new Date().getDate() <= new Date(JSON.parse(lastUpdate)).getDate() && new Date().getMonth() <= new Date(JSON.parse(lastUpdate)).getMonth()) || !initData;

    this.isLoading = true;
    this.indexeddbService.getData('SU').then((data: StudentAttendanceDetails[]) => {
      if (!data.length || shouldFetch) {
        const sub = from(['WI', 'FA', 'SP', 'SI', 'SU'])
          .pipe(
            concatMap(trm =>
              this.attendanceService.getStudentsInfo(trm).pipe(
                tap(res => {
                  this.isLoading = true;
                  this.indexeddbService.clearData(trm);
                  this.indexeddbService.addData(res, trm);
                
                  if (trm === 'SU') {
                    this.rawAttendanceData = res;
                    this.students = this.buildAggregatedData(res);
                    this.numberOfStudents = new Set(
                      this.students.map(s => s.idNum)
                    ).size;
                  }
                })
              )
            )
          )
          .subscribe({
            complete: () => {
              localStorage.setItem(
                'trackLastUpdate',
                JSON.stringify(new Date())
              );
              this.isLoading = false;
            },
            error: err => {
              console.error(err);
              this.isLoading = false;
            }
          });
        this.subscriptions.push(sub);
      }
      else {
        console.log('Loaded from IndexedDB, record count:', data.length);
        this.rawAttendanceData = data;
        this.students = this.buildAggregatedData(data);
        this.numberOfStudents = new Set(this.students.map(s => s.idNum)).size;
        localStorage.setItem('trackLastUpdate', JSON.stringify(new Date()));
        this.isLoading = false;
      }
    }).catch((err) => {
      console.error('IndexedDB error:', err);
      this.isLoading = false;
    });
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
          schoolCde: record.schoolCde,
          crsDiv: record.crsDiv,
          trmCde: record.trmCde,
          yrCde: record.yrCde,
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
          faculty: record.schoolCde,
          hold: record.hold? record.hold.trim() : 'No Hold',
          trmGpa: record.trmGpa,
          wfReason: record.wfReason,
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

    const headers = ['Student ID', 'First Name', 'Last Name', 'Seniority', 'Attendance Status', 'Attendance Date', 'Attendance Time', 'Course', 'Faculty', 'Term Code', 'Year Code'];
    const rows = this.modalRecords.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime()).map(record => [
      record.idNum || '',
      record.firstName || '',
      record.lastName || '',
      record.seniority || '',
      record.attendance?.toUpperCase() || '',
      this.formatDateToYYYYMMDD(record.attendanceDate),
      record.attendanceTime || '',
      record.crsCde || '',
      record.schoolCde || '',
      record.trmCde || '',
      record.yrCde || ''
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
      'Student ID', 'First Name', 'Last Name', 'Entrance Year', 'Entrance Term',
      'Division', 'Visa Type', 'Course', 'Status', 'Seniority', 'Grade',
      'WF Reason', 'Term GPA', 'Midterm Grade', 'Drop Date', 'Withdraw Date', 'Schedule', 'Level',
      'Faculty', 'Major', 'Term Code', 'Year Code',
      'Professor ID', 'Professor Name', 'Total Presences', 'Total Absences',
      'Total Latenesses', 'Absence Limit', 'Meeting Requests', 'Meetings'
    ];

    // Build rows from the current students array (already filtered)
    const rows = this.students.sort((a, b) => b.totalAbsences - a.totalAbsences).map(student => {
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
        escape(student.firstName),
        escape(student.lastName),
        escape(student.entanceYr),
        escape(student.entanceTrm),
        escape(student.studentDiv),
        escape(student.visaType),
        escape(student.crsCde),
        escape(student.status),
        escape(student.seniority),
        escape(student.grade || '-'),
        escape(student.wfReason || '-'),
        escape(student.midtermGrade || '-'),
        escape(student.trmGpa || '-'),
        escape(dropDate),
        escape(withdrawDate),
        escape(student.schedule || '-'),
        escape(student.crsDiv),
        escape(student.schoolCde),
        escape(student.major),
        escape(student.trmCde),
        escape(student.yrCde),
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
