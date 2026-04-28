// meeting-history.component.ts
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { finalize, Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { IndexeddbService } from '../../../services/indexeddb.service';

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

  @Input() searchDto?: SearchDto;
  globalFormGroup!: FormGroup;

  students: StudentTracking[] = [];
  filteredStudents: StudentTracking[] = [];
  visible: boolean = false;
  selectedMeeting?: StudentTracking;
  isSaving: boolean = false;
  
  // Search and filter
  searchTerm: string = '';
  selectedTypes: string[] = []; // Changed to array for multi-select filtering
  
  // Meeting types with display labels - NEW TYPES
  meetingTypes = [
    { label: '👤 Face to Face', value: 'face to face', icon: 'pi pi-users' },
    { label: '📞 Team Call', value: 'team call', icon: 'pi pi-phone' },
    { label: '✉️ By Email', value: 'by email', icon: 'pi pi-envelope' },
    { label: '🔔 First Reminder', value: 'first reminder', icon: 'pi pi-bell' },
    { label: '⚠️ Last Reminder', value: 'last reminder', icon: 'pi pi-exclamation-triangle' }
  ];
  
  // Filter options for multi-select
  typeFilterOptions = this.meetingTypes;
  
  subscriptions: Subscription[] = [];

  // Custom validator for multi-select: at least one type selected
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
  }

  initForm(): void {
    this.globalFormGroup = this.fb.group({
      studentId: [null, Validators.required],
      courseId: [null, Validators.required],
      date: [null, Validators.required],
      type: [[], this.multiSelectRequired], // Changed to array with custom validator
      comment: [null] // Comment no longer required
    });
  }

  // Helper to convert stored comma-separated string to array
  typeStringToArray(typeStr: string): string[] {
    if (!typeStr) return [];
    return typeStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  // Helper to convert array to comma-separated string for backend storage
  typeArrayToString(typeArray: string[]): string {
    if (!typeArray || typeArray.length === 0) return '';
    return typeArray.join(',');
  }

  // Process students after load: add typeArray property and ensure legacy single types are converted
  processStudents(data: StudentTracking[]): StudentTracking[] {
    return data.map(student => {
      // If student.type is a single string (legacy), convert to array property
      (student as any).typeArray = student.type;
      // Ensure backward compatibility: if typeArray is empty but type had value, treat as single
      if ((student as any).typeArray.length === 0 && student.type) {
        (student as any).typeArray = [student.type];
      }
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
      // Use typeArray if available, otherwise convert from type string
      const typeArray = (student as any).typeArray || student.type;
      this.globalFormGroup.patchValue({
        studentId: student.studentSisId,
        courseId: student.coursSisId || '',
        date: student.createdAt ? new Date(student.createdAt) : new Date(),
        type: typeArray,
        comment: student.comment || ''
      });
    } else {
      // Set default empty array for new meeting
      this.globalFormGroup.patchValue({ type: [] });
    }
    this.visible = true;
  }

  cancelDialog(): void {
    this.visible = false;
    this.selectedMeeting = undefined;
    this.globalFormGroup.reset();
  }

  onSave(): void {
    // Validate required fields including multi-select
    if (!this.globalFormGroup.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.globalFormGroup.controls).forEach(key => {
        this.globalFormGroup.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields and select at least one meeting type',
        life: 3000
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.globalFormGroup.value;
    
    // Convert type array to comma-separated string for backend
    const typeString = formValue.type;
    
    const formData: StudentTracking = {
      studentSisId: formValue.studentId,
      coursSisId: formValue.courseId,
      createdAt: formValue.date,
      type: typeString, // Store as comma-separated string
      comment: formValue.comment || '',
      studentName: `Student ${formValue.studentId}` // You can enhance this with actual student lookup
    };
    
    const sub = this.attendanceService.trackStudent(formData).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: (res: StudentTracking) => {
        console.log('Save successful:', res);
        
        // Add typeArray to response for consistent UI handling
        (res as any).typeArray = res.type;
        
        if (this.selectedMeeting) {
          // Update existing record
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...res, id: this.selectedMeeting.id };
            (this.students[index] as any).typeArray = (res as any).typeArray;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Meeting Updated',
            detail: 'Meeting record has been updated successfully',
            life: 3000
          });
        } else {
          // Add new record with highlight
          const newMeeting = { ...res, isNew: true };
          (newMeeting as any).typeArray = (res as any).typeArray;
          this.students.unshift(newMeeting);
          this.messageService.add({
            severity: 'success',
            summary: 'Meeting Scheduled',
            detail: 'New meeting record has been created',
            life: 3000
          });
          
          // Remove highlight after 2 seconds
          setTimeout(() => {
            const meeting = this.students.find(s => s.id === newMeeting.id);
            if (meeting) {
              // meeting.isNew = false;
            }
            this.filterMeetings();
          }, 2000);
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

  filterMeetings(): void {
    this.filteredStudents = this.students.filter(student => {
      const matchesSearch = !this.searchTerm || 
        student.studentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        student.studentSisId?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Multi-select filter: match if any selected type is in student's types (OR logic)
      let matchesType = true;
      if (this.selectedTypes && this.selectedTypes.length > 0) {
        const studentTypes = (student as any).typeArray || student.type;
        matchesType = this.selectedTypes.some(selectedType => studentTypes.includes(selectedType));
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

  updateMeeting() {
    if (this.selectedMeeting && this.selectedMeeting.id) {
      // Get updated values from form
      const updatedTypeArray = this.globalFormGroup.value.type;
      const updatedComment = this.globalFormGroup.value.comment;
      
      // Only proceed if form is valid (at least one type selected)
      if (!updatedTypeArray || updatedTypeArray.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please select at least one meeting type',
          life: 3000
        });
        return;
      }
      
      // Update local object
      this.selectedMeeting.type = updatedTypeArray;
      this.selectedMeeting.comment = updatedComment || this.selectedMeeting.comment;
      (this.selectedMeeting as any).typeArray = updatedTypeArray;
      
      const sub = this.attendanceService.updateTracking(this.selectedMeeting).subscribe({
        next: (res) => {
          // Find and update the record in students array
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...res, id: this.selectedMeeting!.id };
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

  // Helper methods for UI
  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name?: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
      '#ef4444', '#f59e0b', '#10b981', '#06b6d4'
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getTypeSeverity(type: string): 'info' | 'success' | 'warning' | 'danger' | 'contrast' | 'secondary' {
    const severityMap: Record<string, any> = {
      'face to face': 'info',
      'team call': 'success',
      'by email': 'secondary',
      'first reminder': 'warning',
      'last reminder': 'danger'
    };
    return severityMap[type] || 'info';
  }

  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'face to face': 'pi pi-users',
      'team call': 'pi pi-phone',
      'by email': 'pi pi-envelope',
      'first reminder': 'pi pi-bell',
      'last reminder': 'pi pi-exclamation-triangle'
    };
    return iconMap[type] || 'pi pi-calendar';
  }

  getTypeLabel(type: string): string {
    const found = this.meetingTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  truncateComment(comment: string, maxLength: number = 50): string {
    if (!comment) return 'No comments';
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
