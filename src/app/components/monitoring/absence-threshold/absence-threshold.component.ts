import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AttendanceService } from '../../../services/attendance.service';
import { Subscription } from 'rxjs';
import { SearchDto } from '../../../models/dto/searchDto';

@Component({
  selector: 'app-absence-threshold',
  standalone: false,
  templateUrl: './absence-threshold.component.html',
  styleUrl: './absence-threshold.component.css'
})
export class AbsenceThresholdComponent implements OnInit, OnDestroy, OnChanges {
  constructor(
    private attendanceService: AttendanceService,
  ) { }

  @Input() searchDto?: SearchDto
  students: { label: string; value: number; color: string; name: string; course: string, seniority: string }[] = [];
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const sub = this.attendanceService.getRedFlagStudents().subscribe({
      next: (res) => {
        console.log(res);
        this.students = res.map((student: any) => ({
          label: `Absences: ${student.count} / ${student.absentLimit}`,
          value: +((student.count / student.absentLimit) * 100).toFixed(2),
          color: student.count >= student.absentLimit ? 'red' : 'black',
          name: `${student.firstName} ${student.lastName}`,
          course: `${student.course_sis_id}`,
          seniority: student.seniority
        }));
      },
      error: (err) => {
        console.error(err);
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto && this.students.length) {
      this.students = this.students.filter(student => {
        const matchesName = this.searchDto?.studentIds && this.searchDto.studentIds.length > 0 ? this.searchDto.studentIds.some((id: string) => student.name.toLowerCase().includes(id.toLowerCase())) : true;
        const matchesCourse = this.searchDto?.courses && this.searchDto.courses.length > 0 ? this.searchDto.courses.some((course: string) => student.course.toLowerCase().includes(course.toLowerCase())) : true;
        const matchesSeniority = this.searchDto?.seniorities && this.searchDto.seniorities.length > 0 ? this.searchDto.seniorities.some((seniority: string) => student.seniority.toLowerCase().includes(seniority.toLowerCase())) : true;
        return matchesName && matchesCourse && matchesSeniority;
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
