// absence-threshold.component.ts - Updated with multi-select and contact dialog
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription, forkJoin, finalize } from 'rxjs';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { RedFlagStudents } from '../../../models/dto/reFlagStudent';
import { MessageService } from 'primeng/api';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';
import { IndexeddbService } from '../../../services/indexeddb.service';

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
export class AbsenceThresholdComponent implements OnInit, OnDestroy, OnChanges {
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
    { label: '🟢 No pending meetings', value: 'green' },
    { label: '🟡 One pending meeting', value: 'yellow' },
    { label: '🔴 Multiple pending meetings', value: 'red' }
  ];

  // Selection tracking
  selectedStudents: Set<Student> = new Set();

  // Meeting types (same as meeting-history)
  meetingTypes = [
    { label: '👤 Face to Face', value: 'face to face' },
    { label: '📞 Team Call', value: 'team call' },
    { label: '✉️ By Email', value: 'by email' },
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
    this.loadRedFlagStudents();
  }

  initContactForm(): void {
    this.contactForm = this.fb.group({
      type: [[], Validators.required],
      date: [new Date(), Validators.required],
      comment: [null, Validators.required]
    });
  }

  loadRedFlagStudents(): void {
    this.loading = true;
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
          meetings: student.meetings || [],
          _selected: false
        }));
        this.studentsBackup = [...this.students];
        this.updatePagination();
        this.loading = false;
        // Clear selection when data reloads
        this.clearSelection();
      },
      error: (err) => {
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
      // Clear selection when filters change
      this.clearSelection();
    }
  }

  // Getter for students after applying dot color filter
  get displayedStudents(): Student[] {
    if (!this.dotColorFilter) return this.students;
    return this.students.filter(student => {
      const count = this.hasPendingMeeting(student);
      if (this.dotColorFilter === 'green') return count === 0;
      if (this.dotColorFilter === 'yellow') return count === 1;
      if (this.dotColorFilter === 'red') return count > 1;
      return true;
    });
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
    this.indexeddbService.getByStudentId(student.id, student.course).then(records => {
      this.modalRecords = records;
      this.attendanceModal = true;
    });
  }

  resetContactForm(): void {
    this.contactForm.reset({
      type: [],
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
    if (this.contactForm.invalid) {
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
    const meetingType = formValue.type;
    const meetingComment = formValue.comment;

    // Create tracking records for each selected student
    const trackingRequests = this.contactSelectedStudents.map(student => {
      const trackingData: StudentTracking = {
        studentSisId: student.id,
        studentName: student.name,
        coursSisId: student.course,
        createdAt: meetingDate,
        type: meetingType,
        comment: meetingComment
      };
      return this.attendanceService.trackStudent(trackingData);
    });

    forkJoin(trackingRequests).pipe(
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
        this.loadRedFlagStudents();
        
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
