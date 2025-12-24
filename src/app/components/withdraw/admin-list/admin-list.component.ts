import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { AttendanceService } from '../../../services/attendance.service';
import { Wflist } from '../../../models/entities/wflist';
import { ConfirmationService, MessageService } from 'primeng/api';
import { WflistResponse } from '../../../models/dto/wflistResponse';

@Component({
  selector: 'app-admin-list',
  standalone: false,
  templateUrl: './admin-list.component.html',
  styleUrl: './admin-list.component.css'
})
export class AdminListComponent implements OnChanges, OnInit {
  constructor(
    private attendanceService: AttendanceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  @Input() student?: Attendance
  @Input() students: WflistResponse[] = []
  isAdmin: boolean = false

  total: number = 0
  pending: number = 0
  approved: number = 0

  selectedStudent: string = ''
  backupStudents: WflistResponse[] = []

  ngOnInit(): void {
    this.isAdmin = this.attendanceService.getAuthRequest().email === 'Y.Akhoubi@aui.ma' || this.attendanceService.getAuthRequest().email === 'S.Ghajdaoui@aui.ma'
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['students'] && this.students) {
      this.students = this.students.sort((a, b) => new Date(a.request_date).getTime() - new Date(b.request_date).getTime())
      this.students = this.students.sort((a, b) => (a.wf === b.wf)? 0 : a.wf? 1 : -1)
      this.total = this.students.length
      this.pending = this.students.filter(a => a.wf === false).length
      this.approved = this.students.filter(a => a.wf === true).length

      this.students.forEach(a => this.backupStudents.push(a))
    }
    if (changes['student'] && this.student) {
      let item: WflistResponse = {
        teacher_id: this.student.sis_teacher_id,
        teacher_name: this.student.teacher_name,
        student_id: this.student.sis_student_id,
        request_date: new Date(),
        course: this.student.sis_course_id,
        count: this.student.count,
        wf: false,
        course_cde: this.student.course_code,
        absent_limit: this.student.absent_limit,
        first_name: this.student.first_name,
        last_name: this.student.last_name,
      }
      this.students.push(item)
      this.total = this.students.length
      this.pending = this.students.filter(a => a.wf === false).length
      this.approved = this.students.filter(a => a.wf === true).length
    }
  }

  openDialog(event: Event, student: WflistResponse, flag: number) {
    this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: !flag? 'Are you sure that you want to set WF to ' + student.student_id + ' for excessive absences?' : 'Are you sure that you want to refuse the withdrawal request of ' + student.student_id + '?',
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
          if (flag === 0)
            this.approve(student)
          else
            this.refuse(student)
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

  approve(student: WflistResponse) {
    let request: Attendance = {
      sis_student_id: student.student_id,
      sis_course_id: student.course,
      attendance: 'absent',
      count: student.count,
      current_class_cde: '',
      sis_teacher_id: student.teacher_id,
      course_code: student.course_cde,
      teacher_name: student.teacher_name,
      absent_limit: student.absent_limit,
    }
    // student.wf = true
    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Please wait a while...' })
    // this.approved = this.students.filter(a => a.wf === true).length
    // this.pending = this.students.filter(a => a.wf === false).length
    this.attendanceService.withdrawStudent(request).subscribe({
      next: data => {
        if (data) {
          student.wf = true
          this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'The student has been successfully withdrawn' })
          this.approved = this.students.filter(a => a.wf === true).length
          this.pending = this.students.filter(a => a.wf === false).length
        }
      }
    })
  }

  refuse(student: WflistResponse) {
    let request: Wflist = {
      id: student.id,
      student_id: student.student_id,
      course: student.course,
      teacher_id: student.teacher_id,
      request_date: student.request_date,
      count: student.count,
      course_cde: student.course_cde,
      absent_limit: student.absent_limit,
      teacher_name: student.teacher_name,
      wf: false
    }
    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Please wait a while...' })
    this.attendanceService.refuseRequest(request).subscribe({
      next: data => {
        this.students = this.students.filter(a => a.student_id != student.student_id && a.course != student.course)
        this.total = this.students.length
        this.pending = this.students.filter(a => a.wf === false).length
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

    this.students = this.backupStudents.filter(a => a.student_id.toString().startsWith(query)) || this.backupStudents;
    this.total = this.students.length;
    this.pending = this.students.filter(a => a.wf === false).length
    this.approved = this.students.filter(a => a.wf === true).length
  }

  formatDateToDDMMYYY(date: Date): string {
    date = new Date(date)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
  
    return `${day}-${month}-${year}`;
  }
}
