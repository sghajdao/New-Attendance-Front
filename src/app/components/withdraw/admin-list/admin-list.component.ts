import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
  @Output() withdrawnStudents = new EventEmitter<WflistResponse[]>()
  backupStudents: WflistResponse[] = []
  studentToDecline?: WflistResponse

  isAdmin: boolean = false
  showDeclineDialog: boolean = false

  total: number = 0
  pending: number = 0
  approved: number = 0
  excused: number = 0

  selectedStudent: string = ''
  selectedStudents: WflistResponse[] = []

  loading: boolean = false

  ngOnInit(): void {
    this.isAdmin = this.attendanceService.getAuthRequest().email === 'Y.Akhoubi@aui.ma' || this.attendanceService.getAuthRequest().email === 'S.Ghajdaoui@aui.ma'
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['students'] && this.students) {
      // Add selected property to each student
      this.students = this.students.map(student => ({
        ...student,
        selected: false
      }))
      
      this.students = this.students.sort((a, b) => new Date(a.request_date).getTime() - new Date(b.request_date).getTime())
      this.students = this.students.sort((a, b) => (a.wf === b.wf)? 0 : a.wf? 1 : -1)
      this.total = this.students.length
      this.pending = this.students.filter(a => a.wf === false).length
      this.approved = this.students.filter(a => a.wf === true).length

      this.backupStudents = [...this.students]
      this.withdrawnStudents.emit(this.students.filter(a => a.wf === true))
    }
    if (changes['student'] && this.student) {
      let item: WflistResponse = {
        teacher_id: this.student.marked_by_sis_id,
        teacher_name: this.student.instructor_name,
        student_id: this.student.student_sis_id,
        request_date: new Date(),
        course: this.student.course_sis_id,
        count: this.student.count,
        wf: false,
        course_cde: this.student.course_name,
        absent_limit: this.student.absentLimit,
        first_name: this.student.firstName,
        last_name: this.student.lastName,
        excused: 0,
        selected: false
      }
      this.students.push(item)
      this.total = this.students.length
      this.pending = this.students.filter(a => a.wf === false).length
      this.approved = this.students.filter(a => a.wf === true).length
    }
  }

  onSelectionChange() {
    this.selectedStudents = this.students.filter(s => !s.wf && s.selected === true)
  }

  clearSelection() {
    this.students.forEach(student => {
      if (!student.wf) {
        student.selected = false
      }
    })
    this.selectedStudents = []
  }

  approveSelected() {
    if (this.selectedStudents.length === 0) return

    this.confirmationService.confirm({
      target: event?.target as EventTarget,
      message: `Are you sure you want to approve withdrawal requests for ${this.selectedStudents.length} student(s)?`,
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
        label: 'Approve All',
        severity: 'contrast'
      },
      accept: () => {
        this.batchApprove()
      },
      reject: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Rejected',
          detail: 'Batch approval cancelled',
          life: 3000,
        });
      },
    });
  }

  batchApprove() {
    this.loading = true
    const requests: Attendance[] = this.selectedStudents.map(student => ({
      student_sis_id: student.student_id,
      course_sis_id: student.course,
      attendance: '',
      count: student.count,
      marked_at: new Date(),
      seniority: '',
      marked_by_sis_id: student.teacher_id,
      course_name: student.course_cde,
      instructor_name: student.teacher_name,
      status: '',
      grade: '',
      trmCde: '',
      absentLimit: student.absent_limit,
      firstName: student.first_name || '',
      lastName: student.last_name || '',
    }))

    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Processing batch approval...' })
    
    this.attendanceService.withdrawManyStudents(requests).subscribe({
      next: (data: boolean) => {
        if (data) {
          // Update the status of all selected students to approved
          this.selectedStudents.forEach((student) => {
            const originalStudent = this.students.find(s => s.student_id === student.student_id && s.course === student.course)
            if (originalStudent) {
              originalStudent.wf = true
              originalStudent.selected = false
            }
          })
          
          this.messageService.add({ 
            severity: 'info', 
            summary: 'Confirmed', 
            detail: `${this.selectedStudents.length} student(s) successfully withdrawn` 
          })
          
          // Update counters
          this.approved = this.students.filter(a => a.wf === true).length
          this.pending = this.students.filter(a => a.wf === false).length
          this.total = this.students.length
          
          // Clear selection
          this.clearSelection()
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to process batch approval' })
        }
        this.loading = false
      },
      error: err => {
        console.error('Batch approval error:', err)
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while processing batch approval' })
        this.loading = false
      }
    })
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
            this.getStudentToDecline(student)
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

  getStudentToDecline(student: WflistResponse) {
    this.studentToDecline = student
    this.showDeclineDialog = true
  }

  approve(student: WflistResponse) {
    this.loading = true
    let request: Attendance = {
      student_sis_id: student.student_id,
      course_sis_id: student.course,
      attendance: '',
      count: student.count,
      marked_at: new Date(),
      seniority: '',
      marked_by_sis_id: student.teacher_id,
      course_name: student.course_cde,
      instructor_name: student.teacher_name,
      status: '',
      grade: '',
      trmCde: '',
      absentLimit: student.absent_limit,
      firstName: student.first_name || '',
      lastName: student.last_name || '',
    }
    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Please wait a while...' })
    this.attendanceService.withdrawStudent(request).subscribe({
      next: data => {
        if (data) {
          student.wf = true
          this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'The student has been successfully withdrawn' })
          this.approved = this.students.filter(a => a.wf === true).length
          this.pending = this.students.filter(a => a.wf === false).length
          this.loading = false
         } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while withdrawing the student' })
          this.loading = false
         }
       },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while withdrawing the student' })
        this.loading = false
       }
    })
  }

  refuse() {
    if (!this.studentToDecline) return
    this.loading = true
    this.studentToDecline.excused = this.excused
    this.showDeclineDialog = false
    let request: Wflist = {
      id: this.studentToDecline.id,
      student_id: this.studentToDecline.student_id,
      course: this.studentToDecline.course,
      teacher_id: this.studentToDecline.teacher_id,
      request_date: this.studentToDecline.request_date,
      count: this.studentToDecline.count,
      course_cde: this.studentToDecline.course_cde,
      absent_limit: this.studentToDecline.absent_limit,
      teacher_name: this.studentToDecline.teacher_name,
      wf: false,
      excused: this.excused,
    }
    this.messageService.add({ severity: 'warn', summary: 'Wait', detail: 'Please wait a while...' })
    this.attendanceService.refuseRequest(request).subscribe({
      next: data => {
        this.students = this.students.filter(a => a.student_id != this.studentToDecline?.student_id && a.course != this.studentToDecline?.course)
        this.total = this.students.length
        this.pending = this.students.filter(a => a.wf === false).length
        this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successfully refused the request' })
        this.loading = false
      },
      error: err => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while refusing the request' })
        this.loading = false
      }
    })
  }

  filterStudent() {
    let query = this.selectedStudent;

    if (!query || query.trim() === '') {
      this.students = [...this.backupStudents];
      this.total = this.students.length;
      return;
    }

    this.students = this.backupStudents.filter(a => a.student_id.toString().startsWith(query)) || [...this.backupStudents];
    this.total = this.students.length;
    this.pending = this.students.filter(a => a.wf === false).length
    this.approved = this.students.filter(a => a.wf === true).length
  }

  getNumberOfWf(student: WflistResponse) {
    return this.students.filter(a => a.student_id === student.student_id && a.wf === true).length
  }

  formatDateToDDMMYYY(date: Date): string {
    date = new Date(date)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
  
    return `${day}-${month}-${year}`;
  }
}