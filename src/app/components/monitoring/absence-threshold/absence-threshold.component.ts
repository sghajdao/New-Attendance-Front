import { Component, OnDestroy, OnInit } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-absence-threshold',
  standalone: false,
  templateUrl: './absence-threshold.component.html',
  styleUrl: './absence-threshold.component.css'
})
export class AbsenceThresholdComponent implements OnInit, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
  ) { }

  students = [
    { label: 'Absences: 4 / 6', value: 67, color: 'black' },
    { label: 'Absences: 4 / 6', value: 67, color: 'black' },
    { label: 'Absences: 4 / 6', value: 67, color: 'black' },
  ];
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const sub = this.attendanceService.getRedFlagStudents().subscribe({
      next: (res) => {
        console.log(res);
        this.students = res.map((student: any) => ({
          label: `Absences: ${student.count} / ${student.absentLimit}`,
          value: (student.count / student.absentLimit) * 100,
          color: student.count >= student.absentLimit ? 'red' : 'black'
        }));
      },
      error: (err) => {
        console.error(err);
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
