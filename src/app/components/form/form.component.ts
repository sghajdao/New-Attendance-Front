import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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

  globalFormGroup!: FormGroup;

  stateOptions: any[] = [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' }
  ];

  minDate?: Date
  maxDate?: Date

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

    this.globalFormGroup.get('startDate')?.valueChanges.subscribe((startDate: Date) => {
      if (startDate) {
        this.minDate = startDate;
        const minDateObj = new Date(startDate);
        const maxDateObj = new Date(minDateObj);
        maxDateObj.setDate(minDateObj.getDate() + 7);
        this.maxDate = maxDateObj;
      }
    });
    this.globalFormGroup.get('endDate')?.valueChanges.subscribe((endDate: Date) => {
      if (endDate) {
        this.maxDate = endDate;
        const endDateObj = new Date(endDate);
        const minDateObj = new Date(endDateObj);
        minDateObj.setDate(endDateObj.getDate() - 7);
        this.minDate = minDateObj;
      }
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
    window.scrollTo(0, document.body.scrollHeight);
  }
}
