import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FilrterRequest } from '../../../models/dto/filterRequest';
import { AttendanceService } from '../../../services/attendance.service';
import { Observable, Subscription, take } from 'rxjs';
import { Attendance } from '../../../models/entities/attendance';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnDestroy, OnInit {
  constructor(
    private attendanceService: AttendanceService,
    private messageService: MessageService
  ) {}

  @Input() filter?: FilrterRequest

  toExport?: Attendance[]
  private worker: Worker | undefined;

  subsciptions: Subscription[] = []

  @Output() sub = new EventEmitter<Observable<Attendance[]>>()

  ngOnInit(): void {
    const sub = this.attendanceService.attendance$.subscribe(data => this.toExport = data)
    this.subsciptions.push(sub)
  }

  applyFilters() {
    if (this.filter && this.filter.session && (this.filter.session || (this.filter.studentIds && this.filter.studentIds.length) || this.filter.courseId || this.filter.seniority || this.filter.status || (this.filter.startDate && this.filter.endDate))) {
      if (this.filter.status != 'H' || (this.filter.status === 'H' && this.filter.grade != null && !this.filter.grade.length)) {
        this.filter.grade = null
        this.filter.wfLevel = null
      }
      if (this.filter.session === 'Fall Semester') this.filter.session = 'FA'
      else if (this.filter.session === 'Winter Intersession') this.filter.session = 'WI'
      else if (this.filter.session === 'Spring Semester') this.filter.session = 'SP'
      else if (this.filter.session === 'Summer Intersession') this.filter.session = 'SI'

      this.filter.studentIds = this.filter.studentIds?.map(id => id.toString()) || []
      this.sub.emit(this.attendanceService.filterAttendance(this.filter).pipe(take(1)))
    }
  }

  convertToCsv(data: any[]): string {
    if (!data || !data.length) {
      return '';
    }

    const keys = Object.keys(data[0]);
    const csvContent = data.map(row => {
      return keys.map(key => row[key]).join(',');
    });

    return [keys.join(','), ...csvContent].join('\n');
  }

  exportReport() {
    if (this.toExport && this.filter && this.filter.status === 'H' && this.filter.grade && this.filter.grade.includes('WF')) {
      this.attendanceService.getWflist().subscribe({
        next: (wflist) => {
          const mergedData = this.toExport!.map(attendance => {
            const wfItem = wflist.find(wf => wf.student_id === attendance.student_sis_id && wf.course === attendance.course_sis_id);
            return wfItem ? { ...attendance, wf_requested_on: wfItem.request_date, wf_approved_on: wfItem.approve_date } : attendance;
          });
          if (mergedData.length > 1000)
            this.messageService.add({ severity: 'info', summary: 'Wait', detail: 'Please wait a while...', life: 3000 });
          this.worker = new Worker(new URL('../../../reports.worker', import.meta.url), { type: 'module' });
          this.worker.postMessage(mergedData);
          this.worker!.onmessage = ({ data }: { data: Attendance[] }) => {
            const csvData = this.convertToCsv(data.map(({ marked_at, ...item }) => item))
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'attendanceReport.csv';
            a.click();
            window.URL.revokeObjectURL(url);
          };
        }
      })
    }
    else if (this.toExport) {
      if (this.toExport.length > 1000)
        this.messageService.add({ severity: 'info', summary: 'Wait', detail: 'Please wait a while...', life: 3000 });
      this.worker = new Worker(new URL('../../../reports.worker', import.meta.url), { type: 'module' });
      this.worker.postMessage(this.toExport);
      this.worker!.onmessage = ({ data }: { data: Attendance[] }) => {
        const csvData = this.convertToCsv(data.map(({ marked_at, ...item }) => item))
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendanceReport.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      };
    }
  }

  ngOnDestroy(): void {
    this.subsciptions.forEach(sub => sub.unsubscribe())
  }
}
