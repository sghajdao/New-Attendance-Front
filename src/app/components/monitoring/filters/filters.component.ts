import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-filters',
  standalone: false,
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css'
})
export class FiltersComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
  ) { }

  globalFormGroup!: FormGroup;

  students: string[] = [
    'John Doe',
    'Jane Smith',
    'Alice Johnson',
    'Bob Brown',
    'Charlie Davis'
  ];
  courses: string[] = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science'
  ];
  seniorities: string[] = [
    'Junior',
    'Mid-level',
    'Senior',
  ];

  ngOnInit(): void {
    this.globalFormGroup = this.fb.group({
      studentIds: [[]],
      courseIds: [[]],
      seniorities: [[]],
    });
  }
}
