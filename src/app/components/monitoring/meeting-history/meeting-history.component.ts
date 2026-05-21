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
  
  meetingTypes = [
    { label: '👤 Face to Face', value: 'face to face' },
    { label: '🖥️ Team Call', value: 'team call' },
    { label: '📞 Phone Call', value: 'phone call' },
    { label: '✉️ By Email', value: 'by email' },
  ];

  mailTypes = [
    { label: '📨 First Email', value: 'first email' },
    { label: '🔔 First Reminder', value: 'first reminder' },
    { label: '⚠️ Last Reminder', value: 'last reminder' }
  ];

  // New categories options
  categoriesOptions = [
    { label: 'Health & Well-Being', value: 'Health & Well-Being' },
    { label: 'Adaptation & Social Adjustment Challenges', value: 'Adaptation & Social Adjustment Challenges' },
    { label: 'Academic Challenges', value: 'Academic Challenges' },
    { label: 'Scheduling & Transportation Disruption', value: 'Scheduling & Transportation Disruption' },
    { label: 'Personal or Family Reasons', value: 'Personal or Family Reasons' },
    { label: 'Financial or Work Responsibilities', value: 'Financial or Work Responsibilities' },
    { label: 'Administrative or Technical Issues', value: 'Administrative or Technical Issues' },
  ];

  // For the "Other" checkbox and custom input
  showOtherCategory: boolean = false;
  customCategoryText: string = '';
  
  typeFilterOptions = this.meetingTypes;
  subscriptions: Subscription[] = [];

  // Custom validator for multi-select: at least one item selected
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
      this.courses = init.filter(c => c.trmCde === 'SP').at(0)?.courses || [];
    }
  }

  initForm(): void {
    this.globalFormGroup = this.fb.group({
      studentId: [null, Validators.required],
      courseId: [[], this.multiSelectRequired],
      meetingType: [null, this.multiSelectRequired],
      mailType: [[], this.multiSelectRequired],
      comment: [null],
      categories: [[]] // New multi-select field (optional)
    });
  }

  // A computed property for the dropdown (could also just use categoriesOptions directly)
  get categoriesOptionsWithoutOther() {
      return this.categoriesOptions;
  }

  // Call this after loading a meeting to check if any custom category exists
  private syncOtherCategoryFromCategories(categories: string[]): void {
      if (!categories || categories.length === 0) {
          this.showOtherCategory = false;
          this.customCategoryText = '';
          return;
      }
      // Find any category that is NOT in the predefined list
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
  
  // Called when the checkbox toggles
  onOtherCategoryToggle(checked: boolean): void {
      const currentCategories = this.globalFormGroup.get('categories')?.value || [];
      if (!checked) {
          // Remove any custom category from the array
          const predefinedValues = this.categoriesOptions.map(opt => opt.value);
          const filtered = currentCategories.filter((cat: {label: string, value: string}) => predefinedValues.includes(cat.value));
          this.globalFormGroup.patchValue({ categories: filtered });
          this.customCategoryText = '';
      } else {
          // If we already have a custom text, add it immediately
          if (this.customCategoryText.trim()) {
              this.addCustomCategoryToForm();
          }
      }
  }
  
  // Add the current custom category text to the form control (if valid and not already present)
  private addCustomCategoryToForm(): void {
      const newCustom = this.customCategoryText.trim();
      if (!newCustom) return;
      
      const current = this.globalFormGroup.get('categories')?.value || [];
      // Avoid duplicates
      if (!current.includes(newCustom)) {
          this.globalFormGroup.patchValue({ categories: [...current, newCustom] });
      }
  }
  
  // Remove the custom category from the form control (usually when input is cleared)
  private removeCustomCategoryFromForm(): void {
      const current = this.globalFormGroup.get('categories')?.value || [];
      if (this.customCategoryText) {
          const filtered = current.filter((cat: {label: string, value: string}) => cat.value !== this.customCategoryText);
          this.globalFormGroup.patchValue({ categories: filtered });
      }
  }
  
  // Called when the custom input loses focus or user presses Enter
  updateCustomCategory(): void {
      const trimmed = this.customCategoryText.trim();
      if (!trimmed) {
          // If empty, remove the custom category and optionally uncheck the box
          this.removeCustomCategoryFromForm();
          if (this.showOtherCategory) {
              // Optionally uncheck "Other" if the input is cleared
              this.showOtherCategory = false;
          }
          return;
      }
      
      // If we have a non‑empty custom category, add it to the form
      this.addCustomCategoryToForm();
  }

  // Helper: Convert array to comma-separated string
  arrayToString(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.join(',');
  }

  // Process students after load: add courseArray, categoryArray for display
  processStudents(data: StudentTracking[]): StudentTracking[] {
    return data.map(student => {
      (student as any).courseArray = student.coursSisId;
      // Parse categories from stored string to array
      (student as any).categoryArray = student.categories;
      return student;
    });
  }

  loadTrackingData(): void {
    const sub = this.attendanceService.getTracking().subscribe({
      next: (data: StudentTracking[]) => {
        this.students = this.processStudents(data);
        this.filteredStudents = [...this.students];
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
            courseId: student.coursSisId,
            meetingType: null,
            mailType: student.mailType,
            comment: null,
            categories: categoriesArray
        });
        // Sync "Other" checkbox state based on existing categories
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
    if (!this.globalFormGroup.value.studentId || !this.globalFormGroup.value.meetingType || !this.globalFormGroup.value.mailType || !this.globalFormGroup.value.courseId?.length) {
      Object.keys(this.globalFormGroup.controls).forEach(key => {
        this.globalFormGroup.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill all required fields (including at least one course and one meeting type)',
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
      studentName: `Student ${formValue.studentId}`,
      categories: formValue.categories
    };
    
    const sub = this.attendanceService.trackStudent(formData).pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: (res: StudentTracking) => {
        // Process response to include arrays
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
      const updatedMeetingTypeArray = this.globalFormGroup.value.meetingType;
      const updatedMailTypeArray = this.globalFormGroup.value.mailType;
      const updatedComment = this.globalFormGroup.value.comment;
      const updatedCategories = this.globalFormGroup.value.categories;
      
      if (!updatedCourseArray?.length || !updatedMeetingTypeArray?.length) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please select at least one course and one meeting type',
          life: 3000
        });
        return;
      }
      
      // Update local object with stringified values
      this.selectedMeeting.coursSisId = updatedCourseArray;
      this.selectedMeeting.meetingType = updatedMeetingTypeArray;
      this.selectedMeeting.mailType = updatedMailTypeArray;
      this.selectedMeeting.comment = updatedComment || this.selectedMeeting.comment;
      (this.selectedMeeting as any).courseArray = updatedCourseArray;
      (this.selectedMeeting as any).categoryArray = updatedCategories;
      (this.selectedMeeting as any).categories = this.arrayToString(updatedCategories);
      
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

  deleteMeeting(meeting: StudentTracking, index: number): void {    
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
        student.studentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
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

  getMailingTypeLabel(type: string): string {
    return this.mailTypes.find(t => t.value === type)?.label || type;
  }

  truncateComment(comment: string, maxLength: number = 50): string {
    if (!comment) return 'No comments';
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  }

  exportToCSV(): void {
    if (!this.filteredStudents || this.filteredStudents.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'There is no data to export',
        life: 3000
      });
      return;
    }

    // Define CSV headers - added Categories column
    const headers = [
      'Student SIS ID',
      'Student Name',
      'Course SIS ID(s)',
      'Meeting Date',
      'Meeting Type',
      'Mailing Type',
      'Categories',
      'Comments / Notes'
    ];

    // Convert each student to a CSV row
    const rows = this.filteredStudents.map(student => {
      // Format date
      const meetingDate = student.createdAt 
        ? new Date(student.createdAt).toLocaleString() 
        : '';

      // Get course array (already processed as .courseArray)
      const courses = (student as any).courseArray || [];
      const coursesStr = courses.join(', ');

      // Get categories array
      const categories = (student as any).categoryArray || [];
      const categoriesStr = categories.join(', ');

      // Build row data
      const row = [
        student.studentSisId || '',
        student.studentName || '',
        coursesStr,
        meetingDate,
        student.meetingType || '',
        student.mailType || '',
        categoriesStr,
        student.comment || ''
      ];

      // Escape each field: wrap in quotes and replace internal quotes
      return row.map(cell => this.escapeCSVCell(cell)).join(',');
    });

    // Combine header and rows
    const csvContent = [
      headers.map(h => this.escapeCSVCell(h)).join(','),
      ...rows
    ].join('\n');

    // Add BOM for UTF-8 special characters
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

  // Helper method to escape CSV fields (handles commas, quotes, newlines)
  private escapeCSVCell(cell: any): string {
    if (cell === null || cell === undefined) return '""';

    let stringCell = String(cell);
    // If the cell contains commas, quotes, or newlines, wrap in quotes and escape existing quotes
    if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n') || stringCell.includes('\r')) {
      stringCell = stringCell.replace(/"/g, '""'); // Escape double quotes
      return `"${stringCell}"`;
    }
    return stringCell;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
