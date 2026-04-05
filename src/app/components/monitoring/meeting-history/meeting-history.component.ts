import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../../services/attendance.service';
import { SearchDto } from '../../../models/dto/searchDto';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-meeting-history',
  standalone: false,
  templateUrl: './meeting-history.component.html',
  styleUrl: './meeting-history.component.css'
})
export class MeetingHistoryComponent implements OnInit, OnChanges, OnDestroy {
 constructor(
  private fb: FormBuilder,
  private attendanceService: AttendanceService,
 ) { }

  @Input() searchDto?: SearchDto
  globalFormGroup!: FormGroup;

  students: StudentTracking[] = [];

  visible: boolean = false;
  date?: Date
  selectedType?: string;
  types: string[] = [
    'Warning',
    'Follow-up',
    'Final Notice'
  ];
  subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.globalFormGroup = this.fb.group({
      studentId: [null, Validators.required],
      date: [null, Validators.required],
      type: [null, Validators.required],
      comment: [null, Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto) {
      const sub = this.attendanceService.getStudentsTracking(this.searchDto).subscribe({
        next: (res) => {
          console.log(res);
          this.students = res
        },
        error: (err) => {
          console.error(err);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  showDialog(student?: StudentTracking) {
    this.globalFormGroup.reset();
    if (student) {
      this.globalFormGroup.patchValue({
        studentId: student.studentSisId,
        date: student.createdAt,
        type: student.type,
        comment: student.comment
      });
    }
    this.visible = true;
  }

  onSave() {
    if (this.globalFormGroup.valid) {
      const formData: StudentTracking = {
        studentSisId: this.globalFormGroup.value.studentId,
        createdAt: this.globalFormGroup.value.date,
        type: this.globalFormGroup.value.type,
        comment: this.globalFormGroup.value.comment
      }; 
      const sub = this.attendanceService.trackStudent(formData).subscribe({
        next: (res) => {
          console.log(res);
          this.visible = false;
          this.globalFormGroup.reset();
        },
        error: (err) => {
          console.error(err);
        }
      });
      this.subscriptions.push(sub);
    } else {
      console.log('Form is invalid');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
