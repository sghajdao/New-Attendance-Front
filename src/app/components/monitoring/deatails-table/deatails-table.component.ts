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
    const sub = this.attendanceService.getStudentsInfo().subscribe({
      next: (res) => {
        console.log(res.length);
        this.indexeddbService.addData(res, 'info')
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
      this.attendanceService.getStudentsInfo().subscribe({
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

  // Add these helper methods to your component class:
  getStatusSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
      const statusMap: Record<string, any> = {
          'Active': 'success',
          'Completed': 'info',
          'Dropped': 'warning',
          'Withdrawn': 'danger',
          'Expelled': 'danger',
          'Enrolled': 'contrast'
      };
      return statusMap[status] || 'contrast';
  }

  getGradeSeverity(grade: string): 'success' | 'danger' | 'warning' | 'info' | 'contrast' {
      if (!grade || grade === '-') return 'contrast';
      if (grade === 'A' || grade === 'A-') return 'success';
      if (grade === 'B' || grade === 'B+') return 'info';
      if (grade === 'C' || grade === 'C+') return 'warning';
      if (grade === 'D') return 'warning';
      if (grade === 'F' || grade === 'WF') return 'danger';
      return 'contrast';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
