import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../services/attendance.service';
import { Attendance } from '../../models/entities/attendance';
import { Wflist } from '../../models/entities/wflist';
import { WflistResponse } from '../../models/dto/wflistResponse';

@Component({
  selector: 'app-withdraw',
  standalone: false,
  templateUrl: './withdraw.component.html',
  styleUrl: './withdraw.component.css'
})
export class WithdrawComponent implements OnInit {
  constructor(
    private attendanceService: AttendanceService,
  ) {}

  students?: Attendance[]
  requests?: WflistResponse[]
  withdrawnStudents: WflistResponse[] = []

  wfStudent?: Attendance

  ngOnInit(): void {
    this.attendanceService.getStudentList().subscribe({
      next: data => {
        this.students = data
      }
    })

    this.attendanceService.getWflist().subscribe({
      next: data => {
        this.requests = data.sort((a, b) => Number(a.wf) - Number(b.wf));
      }
    })
  }

  addToWflist(student: Attendance) {
    this.wfStudent = student
  }

  getWithdrawnStudents(students: WflistResponse[]) {
    this.withdrawnStudents = students
  }
}
