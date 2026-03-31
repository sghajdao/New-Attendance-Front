import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { AttendanceService } from '../../../services/attendance.service';
import { Wflist } from '../../../models/entities/wflist';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { WflistResponse } from '../../../models/dto/wflistResponse';

@Component({
  selector: 'app-teacher-list',
  standalone: false,
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.css'
})
export class TeacherListComponent implements OnChanges, OnInit {
  constructor(
    private attendanceService: AttendanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  @Input() students?: Attendance[]
  @Input() withdrawnStudents: WflistResponse[] = []
  @Output() student = new EventEmitter<Attendance>()
  studentToDecline?: Attendance

  total: number = 0
  excused: number = 0
  showDeclineDialog: boolean = false
  isAdmin: boolean = false

  selectedStudent: string = ''
  backupStudents: Attendance[] = []

  ngOnInit(): void {
    this.isAdmin = this.attendanceService.getAuthRequest().email === 'Y.Akhoubi@aui.ma' || this.attendanceService.getAuthRequest().email === 'S.Ghajdaoui@aui.ma'
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['students'] && this.students) {
      this.total = this.students.length
      this.students.forEach(a => this.backupStudents.push(a))
    }
    if (changes['withdrawnStudents'] && this.withdrawnStudents && this.students) {
      this.backupStudents = []
      this.students.forEach(a =>this.isReinstates(a)? this.backupStudents.unshift(a) : this.backupStudents.push(a))
      this.students = this.backupStudents
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

  getStudentToDecline(student: Attendance) {
    this.studentToDecline = student
    this.showDeclineDialog = true
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

  refuse() {
    if (!this.studentToDecline || !this.isAdmin) return
    this.showDeclineDialog = false
    let request: Wflist = {
      id: this.studentToDecline.id,
      student_id: this.studentToDecline.student_sis_id,
      course: this.studentToDecline.course_sis_id,
      teacher_id: this.studentToDecline.marked_by_sis_id,
      request_date: new Date(),
      count: this.studentToDecline.count,
      course_cde: this.studentToDecline.course_name,
      absent_limit: this.studentToDecline.absentLimit,
      teacher_name: this.studentToDecline.instructor_name,
      wf: false,
      excused: this.excused,
    }
    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Please wait a while...' })
    this.attendanceService.refuseRequest(request).subscribe({
      next: data => {
        this.students = this.students?.filter(a => a.student_sis_id != this.studentToDecline?.student_sis_id && a.course_sis_id != this.studentToDecline?.course_sis_id)
        this.total = this.students?.length || 0
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successfully refused the request' })
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while refusing the request' })
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

  isReinstates(student: Attendance): boolean {
    return this.withdrawnStudents.some(ws => ws.student_id === student.student_sis_id && ws.course === student.course_sis_id);
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
