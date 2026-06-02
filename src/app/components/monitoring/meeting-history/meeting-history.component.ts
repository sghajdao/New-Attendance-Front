// meeting-history.component.ts
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { finalize, Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { InitData } from '../../../models/dto/initData';

@Component({
  selector: 'app-meeting-history',
  standalone: false,
  templateUrl: './meeting-history.component.html',
  styleUrl: './meeting-history.component.css'
})
export class MeetingHistoryComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private messageService: MessageService,
    private indexedDbService: IndexeddbService,
  ) { }

  @Input() searchDto?: any;
  globalFormGroup!: FormGroup;

  students: StudentTracking[] = [];
  filteredStudents: StudentTracking[] = [];
  visible: boolean = false;
  selectedMeeting?: StudentTracking;
  isSaving: boolean = false;
  
  searchTerm: string = '';
  selectedTypes: string[] = [];
  courses: string[] = [];
  studentsIds: string[] = []
  
  // View mode: 'table' (each row = one course) or 'grid' (cards, one per student)
  viewMode: 'table' | 'grid' = 'table';

  studentName?: string;
  
  meetingTypes = [
    { label: '👤 Face to Face', value: 'face to face' },
    { label: '🖥️ Team Call', value: 'team call' },
    { label: '📞 Phone Call', value: 'phone call' },
    { label: '✉️ By Email', value: 'by email' },
  ];

  mailTypes = [
    { label: '📨 First Email', value: 'first email' },
    { label: '🔔 First Reminder', value: 'first reminder' },
    { label: '⚠️ Last Reminder', value: 'last reminder' },

    { label: '📅 Follow-Up Meeting', value: 'follow up meeting' },
    { label: '🟢 Check-In 1', value: 'check-in 1' },
    { label: '🟡 Check-In 2', value: 'check-in 2' },
    { label: '🔴 Check-In 1 2 3', value: 'check-in 1 2 3' }
  ];

  categoriesOptions = [
    { label: 'Health & Well-Being', value: 'Health & Well-Being' },
    { label: 'Adaptation & Social Adjustment Challenges', value: 'Adaptation & Social Adjustment Challenges' },
    { label: 'Academic Challenges', value: 'Academic Challenges' },
    { label: 'Scheduling & Transportation Disruption', value: 'Scheduling & Transportation Disruption' },
    { label: 'Personal or Family Reasons', value: 'Personal or Family Reasons' },
    { label: 'Financial or Work Responsibilities', value: 'Financial or Work Responsibilities' },
    { label: 'Administrative or Technical Issues', value: 'Administrative or Technical Issues' },
  ];

  showOtherCategory: boolean = false;
  customCategoryText: string = '';
  
  typeFilterOptions = this.meetingTypes;
  subscriptions: Subscription[] = [];

  // Helper: get all rows flattened (one per course) for table view
  get flattenedRows(): any[] {
    const rows: any[] = [];
    this.filteredStudents.forEach(student => {
      const courses = student.coursSisId || [];
      if (courses.length === 0) {
        // No courses: still show a row with empty course
        rows.push({
          ...student,
          singleCourse: '',
          originalStudent: student,
          courseArray: [] // for display
        });
      } else {
        courses.forEach(course => {
          rows.push({
            ...student,
            singleCourse: course,
            originalStudent: student,
            courseArray: [course] // override for template display
          });
        });
      }
    });
    return rows;
  }

  multiSelectRequired(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { required: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadTrackingData();
    const storage = localStorage.getItem('init');
    if (storage) {
      const init: InitData[] = JSON.parse(storage);
      this.courses = init.filter(c => c.trmCde === 'SI').at(0)?.courses || [];
      this.studentsIds = init.filter(c => c.trmCde === 'SI').at(0)?.students || []
    }

    this.globalFormGroup.get('studentId')?.valueChanges.subscribe(value => {
      this.onGetStudentName(value);
    });
  }

  onGetStudentName(value: string) {
    this.indexedDbService.getByStudentId(value, 'SI').then(records => {
      if (records && records.length > 0) {
        const record = records[0];
        this.studentName = record.firstName + ' ' + record.lastName;
      } else {
        this.studentName = value; // fallback to ID if no record found
      }
    }).catch(err => {
      console.error('Error fetching student name from IndexedDB:', err);
      this.studentName = value; // fallback to ID on error
    });
  }

  initForm(): void {
    this.globalFormGroup = this.fb.group({
      studentId: [null, Validators.required],
      courseId: [[], this.multiSelectRequired],
      meetingType: [null, Validators.required],
      mailType: [null, Validators.required],
      comment: [null],
      categories: [[], this.multiSelectRequired]
    });
  }

  get categoriesOptionsWithoutOther() {
    return this.categoriesOptions;
  }

  private syncOtherCategoryFromCategories(categories: string[]): void {
    if (!categories || categories.length === 0) {
      this.showOtherCategory = false;
      this.customCategoryText = '';
      return;
    }
    const predefinedValues = this.categoriesOptions.map(opt => opt.value);
    const custom = categories.find(cat => !predefinedValues.includes(cat));
    if (custom) {
      this.showOtherCategory = true;
      this.customCategoryText = custom;
    } else {
      this.showOtherCategory = false;
      this.customCategoryText = '';
    }
  }
  
  onOtherCategoryToggle(checked: boolean): void {
    const currentCategories = this.globalFormGroup.get('categories')?.value || [];
    if (!checked) {
      const predefinedValues = this.categoriesOptions.map(opt => opt.value);
      const filtered = currentCategories.filter((cat: string) => predefinedValues.includes(cat));
      this.globalFormGroup.patchValue({ categories: filtered });
      this.customCategoryText = '';
    } else {
      if (this.customCategoryText.trim()) {
        this.addCustomCategoryToForm();
      }
    }
  }
  
  private addCustomCategoryToForm(): void {
    const newCustom = this.customCategoryText.trim();
    if (!newCustom) return;
    const current = this.globalFormGroup.get('categories')?.value || [];
    if (!current.includes(newCustom)) {
      this.globalFormGroup.patchValue({ categories: [...current, newCustom] });
    }
  }
  
  private removeCustomCategoryFromForm(): void {
    const current = this.globalFormGroup.get('categories')?.value || [];
    if (this.customCategoryText) {
      const filtered = current.filter((cat: string) => cat !== this.customCategoryText);
      this.globalFormGroup.patchValue({ categories: filtered });
    }
  }
  
  updateCustomCategory(): void {
    const trimmed = this.customCategoryText.trim();
    if (!trimmed) {
      this.removeCustomCategoryFromForm();
      if (this.showOtherCategory) {
        this.showOtherCategory = false;
      }
      return;
    }
    this.addCustomCategoryToForm();
  }

  arrayToString(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.join(',');
  }

  processStudents(data: StudentTracking[]): StudentTracking[] {
    return data.map(student => {
      (student as any).courseArray = student.coursSisId;
      (student as any).categoryArray = student.categories;
      return student;
    });
  }

  loadTrackingData(): void {
    const sub = this.attendanceService.getTracking().subscribe({
      next: (data: StudentTracking[]) => {
        this.students = this.processStudents(data);
        this.filteredStudents = [...this.students];
        console.log('Loaded tracking data:', this.filteredStudents);
      },
      error: (err) => {
        console.error('Error loading tracking data:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load meeting records',
          life: 3000
        });
      }
    });
    this.subscriptions.push(sub);
  }

  showDialog(student?: StudentTracking): void {
    this.globalFormGroup.reset();
    this.selectedMeeting = student;

    if (student) {
      const categoriesArray = (student as any).categoryArray || [];
      this.globalFormGroup.patchValue({
        studentId: student.studentSisId,
        firstName: student.firstName,
        lastName: student.lastName,
        courseId: student.coursSisId,
        meetingType: student.meetingType,
        mailType: student.mailType,
        comment: student.comment,
        categories: categoriesArray
      });
      this.syncOtherCategoryFromCategories(categoriesArray);
    } else {
      this.globalFormGroup.patchValue({ 
        courseId: [], 
        meetingType: null, 
        mailType: null,
        categories: []
      });
      this.showOtherCategory = false;
      this.customCategoryText = '';
    }
    this.visible = true;
  }

  cancelDialog(): void {
    this.visible = false;
    this.selectedMeeting = undefined;
    this.globalFormGroup.reset();
    this.showOtherCategory = false;
    this.customCategoryText = '';
  }

  onSave(): void {
    if (!this.globalFormGroup.value.studentId || !this.globalFormGroup.value.mailType || !this.globalFormGroup.value.comment) {
      Object.keys(this.globalFormGroup.controls).forEach(key => {
        this.globalFormGroup.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields (including at least one course and one mailing type)',
        life: 3000
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.globalFormGroup.value;
    
    const formData: StudentTracking = {
      studentSisId: formValue.studentId,
      coursSisId: formValue.courseId,
      createdAt: new Date(),
      meetingType: formValue.meetingType,
      mailType: formValue.mailType,
      comment: formValue.comment || '',
      firstName: formValue.firstName || '',
      lastName: formValue.lastName || '',
      categories: formValue.categories
    };
    
    const sub = this.attendanceService.trackStudent(formData).pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: (res: StudentTracking) => {
        const processed = this.processStudents([res])[0];
        if (this.selectedMeeting) {
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...processed, id: this.selectedMeeting.id };
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Meeting Updated',
            detail: 'Meeting record has been updated successfully',
            life: 3000
          });
        } else {
          const newMeeting = { ...processed, isNew: true };
          this.students.unshift(newMeeting);
          this.messageService.add({
            severity: 'success',
            summary: 'Meeting Scheduled',
            detail: 'New meeting record has been created',
            life: 3000
          });
          setTimeout(() => this.filterMeetings(), 2000);
        }
        this.filterMeetings();
        this.cancelDialog();
      },
      error: (err) => {
        console.error('Error saving meeting:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to save meeting record',
          life: 4000
        });
      }
    });
    this.subscriptions.push(sub);
  }

  updateMeeting(): void {
    if (this.selectedMeeting && this.selectedMeeting.id) {
      const updatedCourseArray = this.globalFormGroup.value.courseId;
      const updatedMeetingType = this.globalFormGroup.value.meetingType;
      const updatedMailType = this.globalFormGroup.value.mailType;
      const updatedComment = this.globalFormGroup.value.comment;
      const updatedCategories = this.globalFormGroup.value.categories;
      
      if (!updatedCourseArray?.length || !updatedMeetingType) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please select at least one course and a meeting type',
          life: 3000
        });
        return;
      }
      
      this.selectedMeeting.coursSisId = updatedCourseArray;
      this.selectedMeeting.meetingType = updatedMeetingType;
      this.selectedMeeting.mailType = updatedMailType;
      this.selectedMeeting.comment = updatedComment || this.selectedMeeting.comment;
      this.selectedMeeting.categories = updatedCategories;
      
      const sub = this.attendanceService.updateTracking(this.selectedMeeting).subscribe({
        next: (res) => {
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...res, id: this.selectedMeeting!.id };
            (this.students[index] as any).courseArray = updatedCourseArray;
            (this.students[index] as any).categoryArray = updatedCategories;
          }
          this.filterMeetings();
          this.cancelDialog();
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: 'Meeting record updated successfully',
            life: 3000
          });
        },
        error: (err) => {
          console.error('Error updating meeting:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update meeting record',
            life: 3000
          });
          this.cancelDialog();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  deleteMeeting(meeting: StudentTracking, event: Event): void {
    console.log('Attempting to delete meeting with ID:', meeting);
    event.stopPropagation();
    const sub = this.attendanceService.deleteTracking(meeting.id || 0).subscribe({
      next: () => {
        this.students = this.students.filter(s => s.id !== meeting.id);
        this.filterMeetings();
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Meeting record deleted successfully',
          life: 3000
        });
      },
      error: (err) => {
        console.error('Error deleting meeting:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete meeting record',
          life: 3000
        });
      }
    });
    this.subscriptions.push(sub);
  }

  filterMeetings(): void {
    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !this.searchTerm || 
        student.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentSisId?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      let matchesType = true;
      if (this.selectedTypes?.length) {
        matchesType = this.selectedTypes.some(selected => student.meetingType === selected);
      }
      return matchesSearch && matchesType;
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterMeetings();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedTypes = [];
    this.filterMeetings();
    this.messageService.add({
      severity: 'info',
      summary: 'Filters Cleared',
      detail: 'All filters have been reset',
      life: 2000
    });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grid' : 'table';
  }

  // Helper methods for UI
  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name?: string): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f59e0b', '#10b981', '#06b6d4'];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getTypeSeverity(type: string): any {
    const map: Record<string, any> = {
      'face to face': 'info',
      'team call': 'success',
      'by email': 'secondary',
      'first email': 'warning',
      'first reminder': 'warning',
      'last reminder': 'danger'
    };
    return map[type] || 'info';
  }

  getMeetingTypeLabel(type: string): string {
    return this.meetingTypes.find(t => t.value === type)?.label || type;
  }

  getMailTypeLabel(type: string): string {
    return this.mailTypes.find(t => t.value === type)?.label || type;
  }

  truncateComment(comment: string, maxLength: number = 50): string {
    if (!comment) return 'No comments';
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  }

  exportToCSV(): void {
    let dataToExport = this.viewMode === 'table' ? this.flattenedRows : this.filteredStudents;
    
    if (!dataToExport || dataToExport.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'There is no data to export',
        life: 3000
      });
      return;
    }

    const headers = [
      'Student SIS ID',
      'First Name',
      'Last Name',
      'Course SIS ID',
      'Meeting Date',
      'Meeting Type',
      'Mailing Type',
      'Categories',
      'Comments / Notes'
    ];

    const rows = dataToExport.map(item => {
      const meetingDate = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      const courseId = this.viewMode === 'table' ? item.singleCourse : (item.coursSisId || []).join(', ');
      const categories = (item.categoryArray || item.categories || []).join(', ');
      
      return [
        item.studentSisId || '',
        item.firstName || '',
        item.lastName || '',
        courseId,
        meetingDate,
        item.meetingType || '',
        item.mailType || '',
        categories,
        item.comment || ''
      ].map(cell => this.escapeCSVCell(cell)).join(',');
    });

    const csvContent = [
      headers.map(h => this.escapeCSVCell(h)).join(','),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `meeting_history_${new Date().toISOString().slice(0,19)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: 'CSV file has been downloaded',
      life: 3000
    });
  }

  private escapeCSVCell(cell: any): string {
    if (cell === null || cell === undefined) return '""';
    let stringCell = String(cell);
    if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n') || stringCell.includes('\r')) {
      stringCell = stringCell.replace(/"/g, '""');
      return `"${stringCell}"`;
    }
    return stringCell;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
