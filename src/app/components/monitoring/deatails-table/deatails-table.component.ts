import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentInfo } from '../../../models/dto/studentInfo';
import { mergeMap, Subscription } from 'rxjs';

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnChanges, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
  ) { }

  @Input() searchDto?: SearchDto
  subscriptions: Subscription[] = [];

  students: StudentInfo[] = [];

  ngOnInit(): void {
    const sub = this.attendanceService.getStudentsInfo(this.searchDto || {}).subscribe({
      next: (res) => {
        console.log(res);
        this.students = res
      },
      error: (err) => {
        console.error(err);
      }
    })
    this.subscriptions.push(sub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto) {
      this.attendanceService.getStudentsInfo(this.searchDto).subscribe({
        next: (res) => {
          console.log(res);
          this.students = res
        },
        error: (err) => {
          console.error(err);
        }
      })
   }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
