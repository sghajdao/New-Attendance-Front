// absence-threshold.component.ts - Updated with grid/row view toggle
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
  name: string; 
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
  subscriptions: Subscription[] = [];
  loading: boolean = false;

  // View mode: 'grid' or 'list' (row view)
  viewMode: 'grid' | 'list' = 'grid';

  // History dialog
  displayHistoryDialog: boolean = false;
  attendanceModal: boolean = false;
  selectedStudentForHistory: Student | null = null;
  modalRecords: StudentAttendanceDetails[] = [];

  // Contact dialog
  displayContactDialog: boolean = false;
  contactSelectedStudents: Student[] = [];
  contactForm!: FormGroup;
  isContactSaving: boolean = false;

  dotColorFilter: string | null = null;
  dotFilterOptions = [
    { label: '🟢 No contact yet', value: 'green' },
    { label: '🟡 Emailed (1st time)', value: 'yellow' },
    { label: '🔴 Emailed (2nd time)', value: 'orange' },
    { label: '⚫ Emailed (3rd time)', value: 'red' }
  ];

  percentageFilter: string | null = null;
  percentageFilterOptions = [
    { label: 'All', value: null },
    { label: '≥ 50%', value: '50' },
    { label: '≥ 60%', value: '60' },
    { label: '≥ 75%', value: '75' },
    { label: '≥ 90%', value: '90' }
  ];

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
      date: [new Date(), Validators.required],
      comment: [null, Validators.required]
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
            id: student.student_sis_id,
            meetings: student.meetings || [],
            _selected: false
          })
        );
      
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

  // Set view mode and save preference
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    // Save preference to localStorage for persistence across sessions
    localStorage.setItem('absenceThresholdViewMode', mode);
  }

  // Getter for students after applying dot color filter
  get displayedStudents(): Student[] {
    let result = this.students;
  // Dot color filter
  if (this.dotColorFilter) {
    result = result.filter(student => {
      const count = this.hasPendingMeeting(student);
      if (this.dotColorFilter === 'green') return count === 0;
      if (this.dotColorFilter === 'yellow') return count === 1;
      if (this.dotColorFilter === 'red') return count === 2;
      if (this.dotColorFilter === 'black') return count === 3;
      return true;
    });
  }
  // Percentage filter
  if (this.percentageFilter) {
    const minValue = parseInt(this.percentageFilter, 10);
    result = result.filter(student => student.value >= minValue);
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
    this.currentPage = 1;               // reset to first page
    this.updatePagination();
    this.clearSelection();              // avoid confusion with hidden selections
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

  updatePagination(): void {
    this.totalPages = Math.ceil(this.students.length / this.pageSize);
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
      this.selectedStudents.add(student);
      student._selected = true;
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
    this.indexeddbService.getByStudentId(student.id, student.course, 'SP').then(records => {
      this.modalRecords = records;
      this.attendanceModal = true;
    });
  }

  resetContactForm(): void {
    this.contactForm.reset({
      meetingType: null,
      mailType: null,
      date: new Date(),
      comment: null
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
    if (!this.contactForm.value.meetingType || !this.contactForm.value.mailType || !this.contactForm.value.date) {
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
    const meetingDate = formValue.date;
    const meetingType = formValue.meetingType;
    const mailType = formValue.mailType;
    const meetingComment = formValue.comment;

    // Create tracking records for each selected student
    let ids: string[] = [];
    const trackingRequests = this.contactSelectedStudents.map(student => {
      const trackingData: StudentTracking = {
        studentSisId: student.id,
        studentName: student.name,
        coursSisId: [...this.contactSelectedStudents.filter(s => s.id === student.id).map(s => s.course)],
        createdAt: meetingDate,
        meetingType: meetingType,
        mailType: mailType,
        comment: meetingComment
      };
      if (!ids.includes(student.id)) {
        ids.push(student.id);
        return this.attendanceService.trackStudent(trackingData);
      }
      return null as any; // This will be filtered out later
    });

    forkJoin(trackingRequests.filter((v): v is NonNullable<typeof v> => !!v)).pipe(
      finalize(() => {
        this.isContactSaving = false;
      })
    ).subscribe({
      next: (results: StudentTracking[]) => {
        // Success - all requests completed
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Successfully created ${results.length} meeting record(s)`,
          life: 4000
        });
        
        // Refresh the data to show updated meetings
        this.loadData();
        
        // Clear selection and close dialog
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

  hasPendingMeeting(student: Student): number {
    let count = 0
    for (let item of student.meetings) {
      if (!item.comment || !item.comment.trim().length)
        count++;
    }
    if (count === 0 && student.meetings.length !== 0)
      return -1
    return count;
  }

  showHistory(student: Student): void {
    this.selectedStudentForHistory = student;
    this.displayHistoryDialog = true;
  }
  
  formatMeetingDate(date?: Date): string {
    if (!date) return 'No date';
    return new Date(date).toLocaleString();
  }

  closeModal(): void {
    this.attendanceModal = false;
    this.modalRecords = [];
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
    link.setAttribute('download', 'attendance_history.csv');
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

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
