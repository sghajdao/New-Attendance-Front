import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentInfo } from '../../../models/dto/studentInfo';
import { mergeMap } from 'rxjs';

@Component({
  selector: 'app-deatails-table',
  standalone: false,
  templateUrl: './deatails-table.component.html',
  styleUrl: './deatails-table.component.css'
})
export class DeatailsTableComponent implements OnInit, OnChanges {
  constructor(
    private attendanceService: AttendanceService,
  ) { }

  @Input() searchDto?: SearchDto

  students: StudentInfo[] = [];

  ngOnInit(): void {}

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
}
