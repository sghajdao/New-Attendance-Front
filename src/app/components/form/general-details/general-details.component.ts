import { Component, OnInit } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { AttendanceService } from '../../../services/attendance.service';

@Component({
  selector: 'app-general-details',
  standalone: false,
  templateUrl: './general-details.component.html',
  styleUrl: './general-details.component.css'
})
export class GeneralDetailsComponent implements OnInit {
  constructor(
    private attendanceService: AttendanceService,
  ) {}

  show: boolean = false

  ngOnInit(): void {
    this.attendanceService.attendance$.subscribe(data => {
      this.show = true
        this.total = new Set(data.map(a => a.sis_student_id)).size
        this.presences = new Set(data.filter(a => a.attendance === 'present').map(a => a.sis_student_id)).size
        this.absences = new Set(data.filter(a => a.attendance === 'absent').map(a => a.sis_student_id)).size
        this.latenesses = new Set(data.filter(a => a.attendance === 'late').map(a => a.sis_student_id)).size
    })
  }

  attendance?: Attendance[]

  total: number = 0
  presences: number = 0
  absences: number = 0
  latenesses: number = 0
}
