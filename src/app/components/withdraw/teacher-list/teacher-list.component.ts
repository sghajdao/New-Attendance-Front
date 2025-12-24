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
        message: 'Are you sure you want to set WF to ' + student.sis_student_id + ' for excessive absences?',
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
      teacher_id: id? +id : student.sis_teacher_id,
      teacher_name: student.teacher_name,
      student_id: student.sis_student_id,
      request_date: new Date(),
      course: student.sis_course_id,
      count: student.count,
      wf: false,
      course_cde: student.course_code,
      absent_limit: student.absent_limit
    }
    
    this.attendanceService.addToWflist(request).subscribe({
      next: data => {
        this.student.emit(student)
        this.students = this.students?.filter(a => !(a.sis_student_id === student.sis_student_id && a.sis_course_id === student.sis_course_id))
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

    this.students = this.backupStudents.filter(a => a.sis_student_id.toString().startsWith(query)) || this.backupStudents;
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
    this.students.filter(a => a.count >= a.absent_limit + 3).forEach(student => {
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
