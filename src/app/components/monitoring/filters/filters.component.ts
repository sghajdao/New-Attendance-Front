import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SearchDto } from '../../../models/dto/searchDto';
import { InitData } from '../../../models/dto/initData';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';

@Component({
  selector: 'app-filters',
  standalone: false,
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css'
})
export class FiltersComponent implements OnInit, OnDestroy {
  constructor(
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
  ) { }

  globalFormGroup!: FormGroup;
  @Output() search = new EventEmitter<SearchDto>();

  students: string[] = []
  courses: string[] = []
  seniorities: string[] = ['FR', 'SO', 'JR', 'SR', 'GR']
  semesters: string[] = ['SU', 'SI', 'SP', 'FA', 'WI']
  dataBackup: InitData[] = []

  subscriptions: Subscription[] = []

  ngOnInit(): void {
    const storage = localStorage.getItem('init');
    if (storage) {
      const init: InitData[] = JSON.parse(storage);
      this.dataBackup = init;
      this.courses = this.dataBackup.filter(c => c.trmCde === 'SU').at(0)?.courses || []
      this.students = this.dataBackup.filter(c => c.trmCde === 'SU').at(0)?.students || []
    }

    this.globalFormGroup = this.fb.group({
      trmCde: 'SU',
      studentIds: [[]],
      courses: [[]],
      seniorities: [[]],
    });

    const sub = this.globalFormGroup.get('trmCde')?.valueChanges.subscribe((session: string) => {
      if (session && session === 'FA') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'FA').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'FA').at(0)?.students || []
      }
      else if (session && session === 'WI') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'WI').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'WI').at(0)?.students || []
      }
      else if (session && session === 'SP') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'SP').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'SP').at(0)?.students || []
      }
      else if (session && session === 'SI') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'SI').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'SI').at(0)?.students || []
      }
      else if (session && session === 'SU') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'SU').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'SU').at(0)?.students || []
      }
    });
    if (sub)
      this.subscriptions.push(sub);
  }

  onSearch() {
    this.attendanceService.attendanceFilterSource.next(this.globalFormGroup.value);
  }

  onClear() {
    this.globalFormGroup.reset()
    this.globalFormGroup.get('trmCde')?.setValue('SU');
    this.attendanceService.attendanceFilterSource.next(this.globalFormGroup.value);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
