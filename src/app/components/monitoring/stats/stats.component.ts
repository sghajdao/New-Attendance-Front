import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { SearchDto } from '../../../models/dto/searchDto';
import Chart from 'chart.js/auto';
import * as chartJsDataLabels from 'chartjs-plugin-datalabels';

@Component({
  selector: 'app-stats',
  standalone: false,
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() searchDto?: SearchDto;

  students: StudentTracking[] = [];
  backup: StudentTracking[] = [];
  private subscription?: Subscription;
  private static dataLabelsRegistered = false;

  // Original stats
  totalEvents = 0;
  uniqueStudentsCount = 0;
  totalCourseEnrollments = 0;
  mostCommonType = 'N/A';
  avgEventsPerStudent = 0;

  // New stats for follow-up
  totalNotifiedStudents = 0;
  pendingVisits = 0;
  completedVisits = 0;
  totalCoursesInvolved = 0;

  // Chart data
  pieChartData: any;
  pieChartOptions: any;
  barChartData: any;
  barChartOptions: any;
  statusChartData: any;
  statusChartOptions: any;
  topCoursesChartData: any;
  topCoursesChartOptions: any;

  constructor(private attendanceService: AttendanceService) {
    // Register datalabels plugin once globally
    if (!StatsComponent.dataLabelsRegistered) {
      Chart.register(chartJsDataLabels.default);
      StatsComponent.dataLabelsRegistered = true;
    }
  }

  ngOnInit(): void {
    this.loadTrackingData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchDto'] && this.searchDto) {
      if (this.searchDto.trmCde) {
        this.students = this.students.filter(i => i.coursSisId?.some(c => c.startsWith(this.searchDto!.trmCde!)))
      }
      if (this.searchDto.courses && this.searchDto.courses.length) {
        this.students = this.students.filter(i => i.coursSisId?.some(c => this.searchDto?.courses?.includes(c)))
      }
      if (this.searchDto.studentIds && this.searchDto.studentIds.length) {
        this.students = this.students.filter(i => this.searchDto?.studentIds?.includes(i.studentSisId!))
      }
      else if (!this.searchDto.studentIds?.length && !this.searchDto.courses?.length && !this.searchDto.seniorities?.length) {
        this.students = [...this.backup];
      }
    }
  }

  private loadTrackingData(): void {
    this.subscription = this.attendanceService.getTracking().subscribe({
      next: (res) => {
        this.students = res || [];
        this.backup = [...this.students];
        this.computeAllStatsAndCharts();
      },
      error: (err) => {
        console.error('Error loading tracking data:', err);
        this.students = [];
        this.computeAllStatsAndCharts();
      }
    });
  }

  private computeAllStatsAndCharts(): void {
    if (!this.students.length) {
      this.setEmptyOriginalStats();
      this.setEmptyOriginalCharts();
      this.setEmptyNewStats();
      this.setEmptyNewCharts();
      return;
    }

    // Original calculations
    const studentMap = new Map<string, { name: string; count: number; courses: number }>();
    const typeMap = new Map<string, number>();
    let totalCoursesTemp = 0;

    for (const tracking of this.students) {
      const studentId = tracking.studentSisId || tracking.studentName || 'unknown';
      const studentName = tracking.studentName || studentId;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { name: studentName, count: 0, courses: 0 });
      }
      const studentEntry = studentMap.get(studentId)!;
      studentEntry.count++;

      const courseCount = tracking.coursSisId?.length || 0;
      studentEntry.courses += courseCount;
      totalCoursesTemp += courseCount;

      const types = tracking.type || [];
      for (const type of types) {
        if (type && type.trim()) {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      }
    }

    this.totalEvents = this.students.length;
    this.uniqueStudentsCount = studentMap.size;
    this.totalCourseEnrollments = totalCoursesTemp;
    this.avgEventsPerStudent = this.totalEvents / this.uniqueStudentsCount;

    let maxCount = 0;
    let mostCommon = 'N/A';
    for (const [type, count] of typeMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = type;
      }
    }
    this.mostCommonType = mostCommon;

    // Pie chart - Type distribution
    this.pieChartData = {
      labels: Array.from(typeMap.keys()),
      datasets: [{
        data: Array.from(typeMap.values()),
        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#FF7043', '#AB47BC', '#EC407A', '#26C6DA', '#7E57C2', '#FFCA28', '#5C6BC0'],
        hoverBackgroundColor: ['#1E88E5', '#43A047', '#FB8C00', '#E64A19', '#8E24AA', '#D81B60', '#00ACC1', '#5E35B1', '#F9A825', '#3949AB']
      }]
    };

    // Bar chart - Top 5 students
    const topStudents = Array.from(studentMap.entries())
      .map(([id, data]) => ({ name: data.name.length > 20 ? data.name.substring(0, 18) + '...' : data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    this.barChartData = {
      labels: topStudents.map(s => s.name),
      datasets: [{ label: 'Number of Tracking Events', data: topStudents.map(s => s.count), backgroundColor: '#42A5F5', borderRadius: 6, barPercentage: 0.7 }]
    };

    // New stats
    this.totalNotifiedStudents = this.students.length;
    this.pendingVisits = this.students.filter(s => !s.comment || s.comment.trim() === '').length;
    this.completedVisits = this.totalNotifiedStudents - this.pendingVisits;

    const courseStudentMap = new Map<string, Set<string>>();
    for (const student of this.students) {
      const studentId = student.studentSisId || student.studentName || 'unknown';
      const courses = student.coursSisId || [];
      for (const course of courses) {
        if (!course) continue;
        if (!courseStudentMap.has(course)) courseStudentMap.set(course, new Set());
        courseStudentMap.get(course)!.add(studentId);
      }
    }
    this.totalCoursesInvolved = courseStudentMap.size;

    const topCourses = Array.from(courseStudentMap.entries())
      .map(([courseId, studentsSet]) => ({ course: courseId.length > 25 ? courseId.substring(0, 22) + '...' : courseId, studentCount: studentsSet.size }))
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 5);

    this.topCoursesChartData = {
      labels: topCourses.map(c => c.course),
      datasets: [{ label: 'Notified Students', data: topCourses.map(c => c.studentCount), backgroundColor: '#FFA726', borderRadius: 6, barPercentage: 0.7 }]
    };

    this.statusChartData = {
      labels: ['Pending (comment empty)', 'Visited (comment present)'],
      datasets: [{ data: [this.pendingVisits, this.completedVisits], backgroundColor: ['#EF5350', '#66BB6A'], hoverBackgroundColor: ['#E53935', '#4CAF50'], borderWidth: 0 }]
    };

    // Chart options with datalabels (numbers on every piece/bar)
    this.pieChartOptions = this.getPieOptions();
    this.barChartOptions = this.getBarOptions('Students', 'Events', '#42A5F5');
    this.topCoursesChartOptions = this.getBarOptions('Courses', 'Notified Students', '#FFA726');
    this.statusChartOptions = this.getDoughnutOptions();
  }

  private getPieOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 }, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / this.totalEvents) * 100).toFixed(1)}%)` } },
        datalabels: {
          color: 'white',
          font: { weight: 'bold', size: 14 },
          textShadowBlur: 8,
          textShadowColor: 'rgba(0,0,0,0.6)',
          anchor: 'center',
          align: 'center',
          formatter: (value: number) => value
        }
      }
    };
  }

  private getDoughnutOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / this.totalNotifiedStudents) * 100).toFixed(1)}%)` } },
        datalabels: {
          color: 'white',
          font: { weight: 'bold', size: 14 },
          textShadowBlur: 8,
          textShadowColor: 'rgba(0,0,0,0.6)',
          anchor: 'center',
          align: 'center',
          formatter: (value: number) => value
        }
      }
    };
  }

  private getBarOptions(xTitle: string, yTitle: string, barColor: string) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 } } },
        datalabels: {
          color: 'white',
          font: { weight: 'bold', size: 12 },
          anchor: 'end',
          align: 'top',
          offset: 2,
          formatter: (value: number) => value
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: yTitle } },
        x: { ticks: { autoSkip: false, rotation: 20, font: { size: 11 } }, title: { display: true, text: xTitle } }
      }
    };
  }

  private setEmptyOriginalStats(): void {
    this.totalEvents = 0;
    this.uniqueStudentsCount = 0;
    this.totalCourseEnrollments = 0;
    this.mostCommonType = 'N/A';
    this.avgEventsPerStudent = 0;
  }

  private setEmptyOriginalCharts(): void {
    this.pieChartData = { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#B0BEC5'] }] };
    this.barChartData = { labels: ['No Data'], datasets: [{ label: 'Events', data: [0], backgroundColor: '#B0BEC5' }] };
    this.pieChartOptions = this.getPieOptions();
    this.barChartOptions = this.getBarOptions('Students', 'Events', '#B0BEC5');
  }

  private setEmptyNewStats(): void {
    this.totalNotifiedStudents = 0;
    this.pendingVisits = 0;
    this.completedVisits = 0;
    this.totalCoursesInvolved = 0;
  }

  private setEmptyNewCharts(): void {
    this.statusChartData = { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#B0BEC5'] }] };
    this.topCoursesChartData = { labels: ['No Data'], datasets: [{ label: 'Students', data: [0], backgroundColor: '#B0BEC5' }] };
    this.statusChartOptions = this.getDoughnutOptions();
    this.topCoursesChartOptions = this.getBarOptions('Courses', 'Notified Students', '#B0BEC5');
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
