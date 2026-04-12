import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { SearchDto } from '../../../models/dto/searchDto';
import { mergeMap, Subscription } from 'rxjs';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';
import { IndexeddbService } from '../../../services/indexeddb.service';

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnChanges, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
    private indexeddbService: IndexeddbService,
  ) { }

  @Input() searchDto?: SearchDto
  subscriptions: Subscription[] = [];

  students: StudentAttendanceDetails[] = [];

  ngOnInit(): void {
    const sub = this.attendanceService.getStudentsInfo(this.searchDto || {}).subscribe({
      next: (res) => {
        console.log(res.length);
        this.indexeddbService.addData(res, 'info')
        this.students = res.slice(0, 100)
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
