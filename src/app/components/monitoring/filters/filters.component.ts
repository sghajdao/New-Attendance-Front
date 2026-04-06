import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SearchDto } from '../../../models/dto/searchDto';

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
  @Output() search = new EventEmitter<SearchDto>();

  students: string[] = []
  courses: string[] = []
  seniorities: string[] = ['FR', 'SO', 'JR', 'SR', 'GR']

  ngOnInit(): void {
    const storage = localStorage.getItem('init');
    if (storage) {
      const init = JSON.parse(storage);
      this.students = init.students
      this.courses = init.courses
    }

    this.globalFormGroup = this.fb.group({
      studentIds: [[]],
      courseIds: [[]],
      seniorities: [[]],
    });
  }

  onSearch() {
    this.search.emit(this.globalFormGroup.value);
  }
}
