// absence-threshold.component.ts - Added date filter
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription, forkJoin, finalize } from 'rxjs';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { RedFlagStudents } from '../../../models/dto/reFlagStudent';
import { MessageService } from 'primeng/api';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { combineLatest } from 'rxjs';

export interface Student {
  label: string; 
  value: number; 
  color: string; 
  firstName: string; 
  lastName: string; 
  course: string; 
  seniority: string; 
  id: string; 
  meetings: StudentTracking[];
  _selected?: boolean; // For UI binding
}

@Component({
  selector: 'app-absence-threshold',
  standalone: false,
  templateUrl: './absence-threshold.component.html',
  styleUrl: './absence-threshold.component.css'
})
export class AbsenceThresholdComponent implements OnInit, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private indexeddbService: IndexeddbService,
  ) { }

  @Input() searchDto?: SearchDto;
  students: Student[] = [];
  studentsBackup: Student[] = [];
  rawRedFlagData: RedFlagStudents[] = [];
  subscriptions: Subscription[] = [];
  numberOfStudents: number = 0;

  loading: boolean = false;

  // View mode: 'grid' or 'list' (row view)
  viewMode: 'grid' | 'list' = 'grid';

  // History dialog
  displayHistoryDialog: boolean = false;
  attendanceModal: boolean = false;
  selectedStudentForHistory: Student | null = null;
  modalRecords: StudentAttendanceDetails[] = [];

  totalPresences = 0;
  totalAbsences = 0;
  totalLatenesses = 0;

  // Contact dialog
  displayContactDialog: boolean = false;
  contactSelectedStudents: Student[] = [];
  contactForm!: FormGroup;
  isContactSaving: boolean = false;

  sisIdFilterText: string = '';

  dotColorFilter: string | null = null;
  dotFilterOptions = [
    { label: '🟢 No contact yet', value: 'green' },
    { label: '🟡 Emailed (1st time)', value: 'yellow' },
    { label: '🔴 Emailed (2nd time)', value: 'red' },
    { label: '⚫ Emailed (3rd time)', value: 'black' }
  ];

  percentageFilter: string | null = null;
  percentageFilterOptions = [
    { label: 'All', value: null },
    { label: '≥ 50%', value: '50' },
    { label: '≥ 60%', value: '60' },
    { label: '≥ 75%', value: '75' },
    { label: '≥ 90%', value: '90' }
  ];

  classificationFilter: string[] = [];
  classificationFilterOptions = [
    { label: 'Freshmen', value: 'FR' },
    { label: 'Sophomores', value: 'SO' },
    { label: 'Juniors', value: 'JR' },
    { label: 'Seniors', value: 'SR' },
    { label: 'Graduate', value: 'GR' }
  ];

  // Date filter properties
  meetingDateFrom: Date | null = null;
  meetingDateTo: Date | null = null;

  // Selection tracking
  selectedStudents: Set<Student> = new Set();

  // Meeting types (same as meeting-history)
  meetingTypes = [
    { label: '👤 Face to Face', value: 'face to face' },
    { label: '🖥️ Team Call', value: 'team call' },
    { label: '📞 Phone Call', value: 'phone call' },
    { label: '✉️ By Email', value: 'by email' },
  ];

  mailingTypes = [
    { label: '📨 First Email', value: 'first email' },
    { label: '🔔 First Reminder', value: 'first reminder' },
    { label: '⚠️ Last Reminder', value: 'last reminder' }
  ];

  // Categories options (same as meeting-history)
  categoriesOptions = [
    { label: 'Health & Well-Being', value: 'Health & Well-Being' },
    { label: 'Adaptation & Social Adjustment Challenges', value: 'Adaptation & Social Adjustment Challenges' },
    { label: 'Academic Challenges', value: 'Academic Challenges' },
    { label: 'Scheduling & Transportation Disruption', value: 'Scheduling & Transportation Disruption' },
    { label: 'Personal or Family Reasons', value: 'Personal or Family Reasons' },
    { label: 'Financial or Work Responsibilities', value: 'Financial or Work Responsibilities' },
    { label: 'Administrative or Technical Issues', value: 'Administrative or Technical Issues' },
    { label: 'Other', value: 'Other' }
  ];

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 0;
  pageSizeOptions: number[] = [6, 12, 18];

  get paginatedStudents(): typeof this.displayedStudents {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.displayedStudents.slice(start, end);
  }

  ngOnInit(): void {
    this.initContactForm();
    
    // Load saved view preference
    const savedViewMode = localStorage.getItem('absenceThresholdViewMode');
    
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      this.viewMode = savedViewMode;
    }
  
    this.loadData();
  }

  initContactForm(): void {
    this.contactForm = this.fb.group({
      meetingType: [null, Validators.required],
      mailType: [null, Validators.required],
      comment: [null, Validators.required],
      categories: [[]] // New categories field (optional, multi-select)
    });
  }
  
  loadData(): void {
    this.loading = true;
  
    const sub = combineLatest([
      this.attendanceService.getRedFlagStudents(),
      this.attendanceService.attendanceFilter$
    ]).subscribe({
    
      next: ([studentsRes, filter]) => {
      
        // Build base dataset
        const allStudents = studentsRes.map(
          (student: RedFlagStudents) => ({
            label: `Absences: ${student.count} / ${student.absentLimit}`,
            value: +(
              (student.count / student.absentLimit) * 100
            ).toFixed(2),
          
            color:
              student.count >= student.absentLimit
                ? 'red'
                : 'black',
          
            name: `${student.firstName} ${student.lastName}`,
            course: student.course_sis_id,
            seniority: student.seniority,
            firstName: student.firstName,
            lastName: student.lastName,
            id: student.student_sis_id,
            meetings: student.meetings || [],
            _selected: false
          })
        );
      
        this.rawRedFlagData = studentsRes;
        this.numberOfStudents = new Set(allStudents.map(s => s.id)).size;
        this.studentsBackup = allStudents;
      
        // Sets for faster lookup
        const studentIdsSet = new Set(filter.studentIds || []);
        const coursesSet = new Set(filter.courses || []);
        const senioritiesSet = new Set(filter.seniorities || []);
      
        // Apply filters
        let filteredStudents = allStudents;
      
        if (studentIdsSet.size) {
          filteredStudents = filteredStudents.filter(student =>
            studentIdsSet.has(student.id)
          );
        }
      
        if (coursesSet.size) {
          filteredStudents = filteredStudents.filter(student =>
            coursesSet.has(student.course)
          );
        }
      
        if (senioritiesSet.size) {
          filteredStudents = filteredStudents.filter(student =>
            senioritiesSet.has(student.seniority)
          );
        }
      
        this.students = filteredStudents
      
        // Reset pagination
        this.currentPage = 1;
        this.updatePagination();
      
        // Reset filters/selections
        this.clearSelection();
        this.dotColorFilter = null;
        this.percentageFilter = null;
        this.classificationFilter = [];
        this.meetingDateFrom = null;
        this.meetingDateTo = null;
        this.loading = false;
      },
    
      error: err => {
      
        console.error(err);
      
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load student data',
          life: 3000
        });
      
        this.loading = false;
      }
    
    });
  
    this.subscriptions.push(sub);
  }

  // Helper: Convert array to comma-separated string
  arrayToString(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.join(',');
  }

  // Set view mode and save preference
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    // Save preference to localStorage for persistence across sessions
    localStorage.setItem('absenceThresholdViewMode', mode);
  }

  // Getter for students after applying all filters
  get displayedStudents(): Student[] {
    let result = this.students;
    // Dot color filter
    if (this.dotColorFilter) {
      result = result.filter(student => {
        const count = this.countPendingMeetings(student.meetings);
        if (this.dotColorFilter === 'green') return count === 0;
        if (this.dotColorFilter === 'yellow') return count === 1;
        if (this.dotColorFilter === 'red') return count === 2;
        if (this.dotColorFilter === 'black') return count >= 3;
        return true;
      });
    }
    // Percentage filter
    if (this.percentageFilter) {
      const minValue = parseInt(this.percentageFilter, 10);
      result = result.filter(student => student.value >= minValue);
    }

    // Classification filter
    if (this.classificationFilter.length > 0) {
      const selectedValues = this.classificationFilter.map((v: any) => v.value);
      result = result.filter(student => selectedValues.includes(student.seniority));
    }

    // Date filter (meeting createdAt)
    if (this.meetingDateFrom || this.meetingDateTo) {
      result = result.filter(student => {
        if (!student.meetings || student.meetings.length === 0) return false;
        // Check if any meeting falls within the date range
        return student.meetings.some(meeting => {
          if (!meeting.createdAt) return false;
          const meetingDate = new Date(meeting.createdAt);
          // Normalize dates to compare only date part (ignore time)
          const meetingDateOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
          let from = this.meetingDateFrom ? new Date(this.meetingDateFrom.getFullYear(), this.meetingDateFrom.getMonth(), this.meetingDateFrom.getDate()) : null;
          let to = this.meetingDateTo ? new Date(this.meetingDateTo.getFullYear(), this.meetingDateTo.getMonth(), this.meetingDateTo.getDate()) : null;
          if (from && to) {
            return meetingDateOnly >= from && meetingDateOnly <= to;
          } else if (from) {
            return meetingDateOnly >= from;
          } else if (to) {
            return meetingDateOnly <= to;
          }
          return true;
        });
      });
    }

    if (this.sisIdFilterText) {
      const searchTerm = this.sisIdFilterText.toLowerCase();
      result = result.filter(student =>
        student.id.toLowerCase().includes(searchTerm)
      );
    }
    return result;
  }

  // New: Select all currently displayed students
  selectAll(): void {
    this.displayedStudents.forEach(student => {
      if (!this.selectedStudents.has(student)) {
        this.selectedStudents.add(student);
        student._selected = true;
      }
    });
  }

  setPercentageFilter(value: string | null): void {
    this.percentageFilter = value;
    this.currentPage = 1;
    this.updatePagination();
    this.clearSelection();
  }

  getPercentageFilterLabel(): string {
    const option = this.percentageFilterOptions.find(opt => opt.value === this.percentageFilter);
    return option ? option.label : '';
  }

  // New: set dot filter and clear selection
  setDotColorFilter(color: string | null): void {
    this.dotColorFilter = color;
    this.currentPage = 1;
    this.updatePagination();
    this.clearSelection();
  }

  // Optional: helper for the filter dropdown to get icon class
  getDotColorIcon(color: string): string {
    switch(color) {
      case 'green': return 'pi pi-circle-fill green-live-dot';
      case 'yellow': return 'pi pi-circle-fill yellow-live-dot';
      case 'red': return 'pi pi-circle-fill red-live-dot';
      case 'black': return 'pi pi-circle-fill black-live-dot';
      default: return 'pi pi-circle-fill';
    }
  }

  setClassificationFilter(value: any | null): void {
    this.classificationFilter = value || [];
    this.currentPage = 1;
    this.updatePagination();
    this.clearSelection();
  }

  // Date filter methods
  updateDateFilter(): void {
    this.currentPage = 1;
    this.updatePagination();
    this.clearSelection();
  }

  clearDateFilter(): void {
    this.meetingDateFrom = null;
    this.meetingDateTo = null;
    this.currentPage = 1;
    this.updatePagination();
    this.clearSelection();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.displayedStudents.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  onPageChange(event: any): void {
    this.currentPage = (event.first / event.rows) + 1;
    this.pageSize = event.rows;
  }

  // Selection methods
  toggleSelection(event: any, student: Student): void {
    event.stopPropagation();
    if (this.selectedStudents.has(student)) {
      this.selectedStudents.delete(student);
      student._selected = false;
    } else {
      for (let item  of this.students.filter(s => s.id === student.id)) {
        this.selectedStudents.add(item);
        item._selected = true;
      }
    }
  }

  isSelected(student: Student): boolean {
    return this.selectedStudents.has(student);
  }

  getSelectedStudents(): Student[] {
    return this.students.filter(s => this.selectedStudents.has(s));
  }

  clearSelection(): void {
    this.selectedStudents.clear();
    this.students.forEach(s => s._selected = false);
  }

  // Contact methods
  contactStudent(student: Student): void {
    this.openContactDialog([student]);
  }

  openContactDialog(students: Student[]): void {
    if (!students.length) return;
    this.contactSelectedStudents = students;
    this.resetContactForm();
    this.displayContactDialog = true;
  }

  openAttendanceModal(student: Student) {
    this.indexeddbService.getByStudentId(student.id, 'SU').then(records => {
      this.modalRecords = records;
      this.totalPresences = records.filter(r => r.attendance === 'present').length;
      this.totalAbsences = records.filter(r => r.attendance === 'absent').length;
      this.totalLatenesses = records.filter(r => r.attendance === 'late').length;
      this.attendanceModal = true;
    });
  }

  resetContactForm(): void {
    this.contactForm.reset({
      meetingType: null,
      mailType: null,
      comment: null,
      categories: []
    });
    Object.keys(this.contactForm.controls).forEach(key => {
      this.contactForm.get(key)?.markAsUntouched();
    });
  }

  cancelContactDialog(): void {
    this.displayContactDialog = false;
    this.contactSelectedStudents = [];
    this.resetContactForm();
  }

  submitContact(): void {
    if (!this.contactForm.value.mailType) {
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
        life: 3000
      });
      return;
    }

    this.isContactSaving = true;
    const formValue = this.contactForm.value;
    const meetingType = formValue.meetingType;
    const mailType = formValue.mailType;
    const meetingComment = formValue.comment;
    const categories = formValue.categories || [];

    let ids: string[] = [];
    const trackingRequests = this.contactSelectedStudents.map(student => {
      const trackingData: StudentTracking = {
        studentSisId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        coursSisId: [...this.contactSelectedStudents.filter(s => s.id === student.id).map(s => s.course)],
        createdAt: new Date(),
        meetingType: meetingType,
        mailType: mailType,
        comment: meetingComment,
        categories: categories
      };
      if (!ids.includes(student.id)) {
        ids.push(student.id);
        return this.attendanceService.trackStudent(trackingData);
      }
      return null as any;
    });

    forkJoin(trackingRequests.filter((v): v is NonNullable<typeof v> => !!v)).pipe(
      finalize(() => {
        this.isContactSaving = false;
      })
    ).subscribe({
      next: (results: StudentTracking[]) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully created ${results.length} meeting record(s)`,
          life: 4000
        });
        this.loadData();
        this.clearSelection();
        this.cancelContactDialog();
      },
      error: (err) => {
        console.error('Error creating meeting records:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create one or more meeting records. Please try again.',
          life: 5000
        });
      }
    });
  }

  // Helper methods for contact dialog UI
  getContactTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Warning': 'pi pi-exclamation-triangle',
      'Follow-up': 'pi pi-refresh',
      'Final Notice': 'pi pi-bell'
    };
    return iconMap[type] || 'pi pi-calendar';
  }

  getContactTypeLabel(type: string): string {
    const found = this.meetingTypes.find(t => t.value === type);
    return found ? found.label.replace(/^[^a-zA-Z]+/, '') : type;
  }

  getMailTypeLabel(type: string): string {
    const found = this.mailingTypes.find(t => t.value === type);
    return found ? found.label.replace(/^[^a-zA-Z]+/, '') : type;
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

  // Helper to count pending meetings (no comment or empty comment)
  private countPendingMeetings(meetings: any[] = []): number {
    if (!meetings) return 0;
    return meetings.filter(m => !m.comment || !m.comment.trim().length).length;
  }

  hasPendingMeeting(student: Student): number {
    return this.countPendingMeetings(student.meetings);
  }

  showHistory(student: Student): void {
    this.selectedStudentForHistory = student;
    this.displayHistoryDialog = true;
  }
  
  formatMeetingDate(date?: Date | null): string {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  closeModal(): void {
    this.attendanceModal = false;
    this.modalRecords = [];
    this.totalPresences = 0;
    this.totalAbsences = 0;
    this.totalLatenesses = 0;
  }

  exportModalToCSV(): void {
    if (!this.modalRecords.length) {
      return;
    }

    const headers = ['ID', 'First Name', 'Last Name', 'Attendance Status', 'Attendance Date', 'Attendance Time', 'Course', 'Faculty'];
    const rows = this.modalRecords.sort((a, b) => new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime()).map(record => [
      record.idNum || '',
      record.firstName || '',
      record.lastName || '',
      record.attendance?.toUpperCase() || '',
      this.formatDateToYYYYMMDD(record.attendanceDate),
      record.attendanceTime || '',
      record.crsCde,
      record.teacherName
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'attendance_history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private formatDateToYYYYMMDD(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  exportToCSV(): void {
    const filteredRaw = this.getFilteredRawData();
    if (!filteredRaw.length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No students match the current filters.',
        life: 3000
      });
      return;
    }
  
    const headers = [
      'Student SIS ID', 'First Name', 'Last Name', 'Course SIS ID', 'Course Name',
      'Instructor', 'Status', 'Grade', 'Term Code', 'Seniority',
      'Absence Count', 'Absence Limit', 'Absence Percentage',
      'Meetings Count', 'First Mail Date', 'Marked By SIS ID'
    ];
  
    const rows = filteredRaw.sort((a, b) => b.count - a.count).map(student => {
      const percentage = ((student.count / student.absentLimit) * 100).toFixed(2);
      return [
        student.student_sis_id,
        student.firstName,
        student.lastName,
        student.course_sis_id,
        student.course_name,
        student.instructor_name,
        student.status,
        student.grade,
        student.trmCde,
        student.seniority,
        student.count,
        student.absentLimit,
        `${percentage}%`,
        student.meetings?.length || 0,
        this.formatMeetingDate(student.meetings && student.meetings.length > 0 ? student.meetings[0].createdAt : null),
        student.marked_by_sis_id
      ];
    });
  
    const escapeCSV = (cell: any) => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
  
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `red_flag_students_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  private getFilteredRawData(): RedFlagStudents[] {
    let result = [...this.rawRedFlagData];
  
    if (this.dotColorFilter) {
      result = result.filter(student => {
        const pendingCount = this.countPendingMeetings(student.meetings);
        if (this.dotColorFilter === 'green') return pendingCount === 0;
        if (this.dotColorFilter === 'yellow') return pendingCount === 1;
        if (this.dotColorFilter === 'red') return pendingCount === 2;
        if (this.dotColorFilter === 'black') return pendingCount >= 3;
        return true;
      });
    }
  
    if (this.percentageFilter) {
      const minValue = parseInt(this.percentageFilter, 10);
      result = result.filter(student => {
        const percentage = (student.count / student.absentLimit) * 100;
        return percentage >= minValue;
      });
    }

    if (this.classificationFilter.length > 0) {
      const selectedValues = this.classificationFilter.map((v: any) => v.value);
      result = result.filter(student => selectedValues.includes(student.seniority));
    }

    // Apply date filter to raw data as well
    if (this.meetingDateFrom || this.meetingDateTo) {
      result = result.filter(student => {
        if (!student.meetings || student.meetings.length === 0) return false;
        return student.meetings.some(meeting => {
          if (!meeting.createdAt) return false;
          const meetingDate = new Date(meeting.createdAt);
          const meetingDateOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
          let from = this.meetingDateFrom ? new Date(this.meetingDateFrom.getFullYear(), this.meetingDateFrom.getMonth(), this.meetingDateFrom.getDate()) : null;
          let to = this.meetingDateTo ? new Date(this.meetingDateTo.getFullYear(), this.meetingDateTo.getMonth(), this.meetingDateTo.getDate()) : null;
          if (from && to) {
            return meetingDateOnly >= from && meetingDateOnly <= to;
          } else if (from) {
            return meetingDateOnly >= from;
          } else if (to) {
            return meetingDateOnly <= to;
          }
          return true;
        });
      });
    }
  
    return result;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
