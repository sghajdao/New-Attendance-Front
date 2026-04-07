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
  students: { label: string; value: number; color: string; name: string; course: string, seniority: string, id: string }[] = [];
  studentsBackup: { label: string; value: number; color: string; name: string; course: string, seniority: string, id: string }[] = [];
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const sub = this.attendanceService.getRedFlagStudents().subscribe({
      next: (res) => {
        this.students = res.map((student: any) => ({
          label: `Absences: ${student.count} / ${student.absentLimit}`,
          value: +((student.count / student.absentLimit) * 100).toFixed(2),
          color: student.count >= student.absentLimit ? 'red' : 'black',
          name: `${student.firstName} ${student.lastName}`,
          course: `${student.course_sis_id}`,
          seniority: student.seniority,
          id: student.student_sis_id
        }));
        this.studentsBackup = [...this.students];
      },
      error: (err) => {
        console.error(err);
      }
    });
    this.subscriptions.push(sub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto && this.students.length) {
      if (this.searchDto.studentIds?.length)
        this.students = this.studentsBackup.filter(student => this.searchDto?.studentIds?.includes(student.id))
      if (this.searchDto.courses?.length)
        this.students = this.students.filter(student => this.searchDto?.courses?.includes(student.course))
      if (this.searchDto.seniorities?.length)
        this.students = this.students.filter(student => this.searchDto?.seniorities?.includes(student.seniority))
      else if (!this.searchDto.studentIds?.length && !this.searchDto.courses?.length && !this.searchDto.seniorities?.length)
        this.students = this.studentsBackup;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
