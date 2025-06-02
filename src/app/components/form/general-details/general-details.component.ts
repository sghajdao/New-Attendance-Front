import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';

@Component({
  selector: 'app-general-details',
  standalone: false,
  templateUrl: './general-details.component.html',
  styleUrl: './general-details.component.css'
})
export class GeneralDetailsComponent implements OnChanges {
  constructor() {}

  @Input() attendance?: Attendance[]

  total: number = 0
  presences: number = 0
  absences: number = 0
  latenesses: number = 0

  ngOnChanges(changes: SimpleChanges): void {
    if (this.attendance) {
      this.total = new Set(this.attendance.map(a => a.sis_student_id)).size
      this.presences = new Set(this.attendance.filter(a => a.attendance === 'present').map(a => a.sis_student_id)).size
      this.absences = new Set(this.attendance.filter(a => a.attendance === 'absent').map(a => a.sis_student_id)).size
      this.latenesses = new Set(this.attendance.filter(a => a.attendance === 'late').map(a => a.sis_student_id)).size
    }
  }
}
