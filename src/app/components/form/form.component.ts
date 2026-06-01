import { AfterViewChecked, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Attendance } from '../../models/entities/attendance';
import { Observable, Subscription } from 'rxjs';
import { AttendanceService } from '../../services/attendance.service';
import { InitData } from '../../models/dto/initData';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
  ) {}
  
  seesions: string[] = ['Fall Semester', 'Winter Intersession', 'Spring Semester', 'Summer Intersession']
  students: string[] = []
  courses: string[] = []
  seniorities: string[] = ['FR', 'SO', 'JR', 'SR', 'GR']
  status: string[] = ['C', 'H', 'D']
  grades: string[] = ['W', 'WF', 'NGW', 'NG', 'EX', 'A']
  // all / half / one left
  wfLevel: string[] = ['All', 'One Left']
  
  dataBackup: InitData[] = []
  globalFormGroup!: FormGroup;
  
  minDate?: Date
  maxDate?: Date
  
  result: number = 0
  blockCards: boolean = true
  
  subscriptions: Subscription[] = []

  ngOnInit(): void {
    const data = localStorage.getItem('init')
    if (data) {
      this.dataBackup = JSON.parse(data)
    }
    
    this.globalFormGroup = this.fb.group({
      session: [null],
      studentIds: [[]],
      courseId: [null],
      seniority: [null],
      status: [null],
      grade: [[]],
      wfLevel: [null],
      startDate: [null],
      endDate: [null]
    });
    
    const sub1 = this.globalFormGroup.get('startDate')?.valueChanges.subscribe((startDate: Date) => {
      if (startDate) {
        this.minDate = startDate;
        const minDateObj = new Date(startDate);
        const maxDateObj = new Date(minDateObj);
        maxDateObj.setDate(minDateObj.getDate() + 7);
        this.maxDate = maxDateObj;
      }
    });
    const sub2 = this.globalFormGroup.get('endDate')?.valueChanges.subscribe((endDate: Date) => {
      if (endDate) {
        this.maxDate = endDate;
        const endDateObj = new Date(endDate);
        const minDateObj = new Date(endDateObj);
        minDateObj.setDate(endDateObj.getDate() - 7);
        this.minDate = minDateObj;
      }
    });
    const sub3 = this.globalFormGroup.get('session')?.valueChanges.subscribe((session: string) => {
      if (session && session === 'Fall Semester') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'FA').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'FA').at(0)?.students || []
      }
      else if (session && session === 'Winter Intersession') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'WI').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'WI').at(0)?.students || []
      }
      else if (session && session === 'Spring Semester') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'SP').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'SP').at(0)?.students || []
      }
      else if (session && session === 'Summer Intersession') {
        this.courses = this.dataBackup.filter(c => c.trmCde === 'SI').at(0)?.courses || []
        this.students = this.dataBackup.filter(c => c.trmCde === 'SI').at(0)?.students || []
      }
    });
    this.subscriptions.push(sub1!, sub2!, sub3!);
  }

  clearFilters() {
    this.globalFormGroup = this.fb.group({
      session: [null],
      studentIds: [[]],
      courseId: [null],
      seniority: [null],
      status: [null],
      grade: [[]],
      wfLevel: [null],
      startDate: [null],
      endDate: [null],
    });
    this.minDate = undefined
    this.maxDate = undefined
  }

  getSub(obs: Observable<Attendance[]>) {
    this.result = 1
    const sub = obs.subscribe({
      next: data => {
        this.attendanceService.attendanceSource.next(data)
        this.result = 2
        setTimeout(() => {
          window.scrollTo(0, document.body.scrollHeight);
        }, 1000)
      }
    })
    this.subscriptions.push(sub)
  }

  formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getFullYear();
  
    return `${day}-${month}-${year}`;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
}
