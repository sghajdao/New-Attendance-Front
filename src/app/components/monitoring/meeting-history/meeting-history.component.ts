import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  selectedType: string | null = null;
  
  // Meeting types with display labels
  meetingTypes = [
    { label: '📧 Warning', value: 'Warning', icon: 'pi pi-exclamation-triangle' },
    { label: '📝 Follow-up', value: 'Follow-up', icon: 'pi pi-refresh' },
    { label: '⚠️ Final Notice', value: 'Final Notice', icon: 'pi pi-bell' }
  ];
  
  typeFilterOptions = [
    { label: 'All Types', value: null },
    ...this.meetingTypes
  ];
  
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.initForm();
    this.loadTrackingData();
  }

  initForm(): void {
    this.globalFormGroup = this.fb.group({
      studentId: [null, Validators.required],
      courseId: [null, Validators.required],
      date: [null, Validators.required],
      type: [null, Validators.required],
      comment: [null, Validators.required]
    });
  }

  loadTrackingData(): void {
    const sub = this.attendanceService.getTracking().subscribe({
      next: (data: StudentTracking[]) => {
        this.students = data;
        this.filteredStudents = [...data];
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
      this.globalFormGroup.patchValue({
        studentId: student.studentSisId,
        courseId: student.coursSisId || '',
        date: student.createdAt ? new Date(student.createdAt) : new Date(),
        type: student.type,
        comment: student.comment
      });
    }
    this.visible = true;
  }

  cancelDialog(): void {
    this.visible = false;
    this.selectedMeeting = undefined;
    this.globalFormGroup.reset();
  }

  onSave(): void {
    if (this.globalFormGroup.value.studentId && this.globalFormGroup.value.courseId && this.globalFormGroup.value.date && this.globalFormGroup.value.type) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.globalFormGroup.controls).forEach(key => {
        key === 'comment'? null : this.globalFormGroup.get(key)?.markAsTouched();
      });
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
        life: 3000
      });
      return;
    }

    this.isSaving = true;
    const formValue = this.globalFormGroup.value;
    
    const formData: StudentTracking = {
      studentSisId: formValue.studentId,
      coursSisId: formValue.courseId,
      createdAt: formValue.date,
      type: formValue.type,
      comment: formValue.comment,
      studentName: `Student ${formValue.studentId}` // You can enhance this with actual student lookup
    };
    
    const sub = this.attendanceService.trackStudent(formData).pipe(
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe({
      next: (res: StudentTracking) => {
        console.log('Save successful:', res);
        
        if (this.selectedMeeting) {
          // Update existing record
          const index = this.students.findIndex(s => s.id === this.selectedMeeting?.id);
          if (index !== -1) {
            this.students[index] = { ...res, id: this.selectedMeeting.id };
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
      
      const matchesType = !this.selectedType || student.type === this.selectedType;
      
      return matchesSearch && matchesType;
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterMeetings();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = null;
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
      this.selectedMeeting.type = this.globalFormGroup.value.type? this.globalFormGroup.value.type : this.selectedMeeting.type
      this.selectedMeeting.comment = this.globalFormGroup.value.comment? this.globalFormGroup.value.comment : this.selectedMeeting.comment

      // Example delete implementation:
      const sub = this.attendanceService.updateTracking(this.selectedMeeting).subscribe({
        next: (res) => {
          this.students = this.students.filter(s => s.id !== this.selectedMeeting?.id);
          this.students.push(res)
          this.cancelDialog()
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: 'Meeting record updated successfully',
            life: 3000
          });
        },
        error: (err) => {
          console.error('Error updating meeting:', err);
          this.cancelDialog()
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update meeting record',
            life: 3000
          });
        }
      });
      this.subscriptions.push(sub);
    }
  }

  deleteMeeting(meeting: StudentTracking, index: number): void {    
    // Example delete implementation:
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

  getTypeSeverity(type: string): 'info' | 'success' | 'warning' | 'danger' | 'contrast' {
    const severityMap: Record<string, any> = {
      'Warning': 'warning',
      'Follow-up': 'info',
      'Final Notice': 'danger'
    };
    return severityMap[type] || 'info';
  }

  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'Warning': 'pi pi-exclamation-triangle',
      'Follow-up': 'pi pi-refresh',
      'Final Notice': 'pi pi-bell'
    };
    return iconMap[type] || 'pi pi-calendar';
  }

  getTypeLabel(type: string): string {
    const found = this.meetingTypes.find(t => t.value === type);
    return found ? found.label.replace(/^[^a-zA-Z]+/, '') : type;
  }

  truncateComment(comment: string, maxLength: number = 50): string {
    if (!comment) return 'No comments';
    return comment.length > maxLength ? comment.substring(0, maxLength) + '...' : comment;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
