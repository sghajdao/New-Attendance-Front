import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SearchDto } from '../../../models/dto/searchDto';
import { InitData } from '../../../models/dto/initData';

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
      const init: InitData[] = JSON.parse(storage);
      this.students = init.filter(c => c.trmCde === 'SP').at(0)?.students || []
      this.courses = init.filter(c => c.trmCde === 'SP').at(0)?.courses || []
    }

    this.globalFormGroup = this.fb.group({
      studentIds: [[]],
      courses: [[]],
      seniorities: [[]],
    });
  }

  onSearch() {
    this.search.emit(this.globalFormGroup.value);
  }
}
