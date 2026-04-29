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
    { label: '👤 Face to Face', value: 'face to face', icon: 'pi pi-users' },
    { label: '📞 Team Call', value: 'team call', icon: 'pi pi-phone' },
    { label: '✉️ By Email', value: 'by email', icon: 'pi pi-envelope' },
    { label: '🔔 First Reminder', value: 'first reminder', icon: 'pi pi-bell' },
    { label: '⚠️ Last Reminder', value: 'last reminder', icon: 'pi pi-exclamation-triangle' }
  ];
  
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
      courseId: [[], this.multiSelectRequired], // Changed to array multi-select
      date: [null, Validators.required],
      type: [[], this.multiSelectRequired],
      comment: [null]
    });
  }

  // Helper: Convert comma-separated string to array
  stringToArray(str?: string): string[] {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  // Helper: Convert array to comma-separated string
  arrayToString(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.join(',');
  }

  // Process students after load: add typeArray and courseArray for display
  processStudents(data: StudentTracking[]): StudentTracking[] {
    return data.map(student => {
      (student as any).typeArray = student.type;
      (student as any).courseArray = student.coursSisId;
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
      const typeArray = (student as any).typeArray || student.type;
      const courseArray = (student as any).courseArray || student.coursSisId;
      this.globalFormGroup.patchValue({
        studentId: student.studentSisId,
        courseId: courseArray,
        date: student.createdAt ? new Date(student.createdAt) : new Date(),
        type: typeArray,
        comment: student.comment || ''
      });
    } else {
      this.globalFormGroup.patchValue({ courseId: [], type: [] });
    }
    this.visible = true;
  }

  cancelDialog(): void {
    this.visible = false;
    this.selectedMeeting = undefined;
    this.globalFormGroup.reset();
  }

  onSave(): void {
    if (!this.globalFormGroup.valid) {
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
      coursSisId: formValue.courseId,  // Convert array to string
      createdAt: formValue.date,
      type: formValue.type,            // Convert array to string
      comment: formValue.comment || '',
      studentName: `Student ${formValue.studentId}`
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
      const updatedTypeArray = this.globalFormGroup.value.type;
      const updatedComment = this.globalFormGroup.value.comment;
      
      if (!updatedCourseArray?.length || !updatedTypeArray?.length) {
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
      this.selectedMeeting.type = updatedTypeArray;
      this.selectedMeeting.comment = updatedComment || this.selectedMeeting.comment;
      (this.selectedMeeting as any).courseArray = updatedCourseArray;
      (this.selectedMeeting as any).typeArray = updatedTypeArray;
      
      const sub = this.attendanceService.updateTracking(this.selectedMeeting).subscribe({
        next: (res) => {
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...res, id: this.selectedMeeting!.id };
            (this.students[index] as any).courseArray = updatedCourseArray;
            (this.students[index] as any).typeArray = updatedTypeArray;
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
        const studentTypes = (student as any).typeArray || student.type;
        matchesType = this.selectedTypes.some(selected => studentTypes.includes(selected));
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

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'face to face': 'pi pi-users',
      'team call': 'pi pi-phone',
      'by email': 'pi pi-envelope',
      'first reminder': 'pi pi-bell',
      'last reminder': 'pi pi-exclamation-triangle'
    };
    return map[type] || 'pi pi-calendar';
  }

  getTypeLabel(type: string): string {
    return this.meetingTypes.find(t => t.value === type)?.label || type;
  }

  truncateComment(comment: string, maxLength: number = 50): string {
    if (!comment) return 'No comments';
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
