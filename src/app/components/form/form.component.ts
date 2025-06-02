import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Attendance } from '../../models/entities/attendance';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
  ) {}

  attendance?: Attendance[]

  students: string[] = []
  courses: string[] = []
  seniorities: string[] = []
  status: string[] = []

  value: number = 50;

  formGroup!: FormGroup;

  globalFormGroup!: FormGroup;

  stateOptions: any[] = [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' }
  ];

  ngOnInit(): void {
    const data = localStorage.getItem('init')
    if (data) {
      this.students = JSON.parse(data).students
      this.courses = JSON.parse(data).courses
    }

    this.seniorities = [
      'FR', 'SO', 'JR', 'SR'
    ]

    this.status = [
      'C', 'H', 'D'
    ]

    this.formGroup = new FormGroup({
      value: new FormControl('on')
    });

    this.globalFormGroup = this.fb.group({
      studentId: [null],
      courseId: [null],
      seniority: [null],
      status: [null],
      startDate: [null],
      endDate: [null],
      absenceLimitEnabled: 'on',
      absentLimit: [50]
    });
  }

  clearFilters() {
    this.globalFormGroup = this.fb.group({
      studentId: [null],
      courseId: [null],
      seniority: [null],
      status: [null],
      startDate: [null],
      endDate: [null],
      absenceLimitEnabled: 'on',
      absentLimit: [50]
    });
  }

  getAttendance(response: Attendance[]) {
    this.attendance = response
  }
}
