import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { AttendanceService } from '../../../services/attendance.service';
import { Wflist } from '../../../models/entities/wflist';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';

@Component({
  selector: 'app-teacher-list',
  standalone: false,
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.css'
})
export class TeacherListComponent implements OnChanges {
  constructor(
    private attendanceService: AttendanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  @Input() students?: Attendance[]
  @Output() student = new EventEmitter<Attendance>()

  total: number = 0

  selectedStudent: string = ''
  backupStudents: Attendance[] = []

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['students'] && this.students) {
      this.total = this.students.length
      this.students.forEach(a => this.backupStudents.push(a))
    }
  }

  openDialog(event: Event, student: Attendance) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Are you sure you want to set WF to ' + student.student_sis_id + ' for excessive absences?',
        header: 'Confirmation',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true,
        },
        acceptButtonProps: {
            label: 'Approve',
            severity: 'contrast'
        },
        accept: () => {
            this.approve(student)
        },
        reject: () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Rejected',
                detail: 'You have rejected',
                life: 3000,
            });
        },
    });
  }

  approve(student: Attendance) {
    const id = localStorage.getItem('id')
    let request: Wflist = {
      teacher_id: id? id : student.marked_by_sis_id,
      teacher_name: student.instructor_name,
      student_id: student.student_sis_id,
      request_date: new Date(),
      course: student.course_sis_id,
      count: student.count,
      wf: false,
      course_cde: student.course_name,
      absent_limit: student.absentLimit,
      excused: 0,
    }
    
    this.attendanceService.addToWflist(request).subscribe({
      next: data => {
        this.student.emit(student)
        this.students = this.students?.filter(a => !(a.student_sis_id === student.student_sis_id && a.course_sis_id === student.course_sis_id))
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successfully added to withdrawal requests' })
        this.total = this.students!.length
      }
    })
  }

  filterStudent() {
    let query = this.selectedStudent;

    if (!query || query.trim() === '') {
      this.students = this.backupStudents;
      this.total = this.students.length;
      return;
    }

    this.students = this.backupStudents.filter(a => a.student_sis_id.toString().startsWith(query)) || this.backupStudents;
    this.total = this.students.length;
  }

  downloadStudentsCsv() {
    if (!this.students || this.students.length === 0) {
      return;
    }
  
    const csvRows: string[] = [];
  
    // Extract headers
    const headers = Object.keys(this.students[0]);
    csvRows.push(headers.join(','));
  
    // Add rows
    this.students.filter(a => a.count >= a.absentLimit + 3).forEach(student => {
      const values = headers.map(h => {
        const val = (student as Record<string, any>)[h] ?? '';
        // Escape quotes and commas
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
  
    // Create Blob
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
