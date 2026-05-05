import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { StudentTracking } from '../../../models/entities/studentTracking';

@Component({
  selector: 'app-stats',
  standalone: false,
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit, OnDestroy {
  @Input() searchDto?: any;

  students: StudentTracking[] = [];
  private subscription?: Subscription;

  // Key stats
  totalNotifiedStudents = 0;
  pendingVisits = 0;        // comment null/empty
  completedVisits = 0;      // comment present
  totalCoursesInvolved = 0;

  // Status chart (doughnut)
  statusChartData: any;
  statusChartOptions: any;

  // Top courses chart (bar)
  topCoursesChartData: any;
  topCoursesChartOptions: any;

  // Optional: keep type distribution if needed, but we can remove or adapt
  // We'll keep it to avoid breaking existing code but rename label.

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.loadTrackingData();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private loadTrackingData(): void {
    this.subscription = this.attendanceService.getTracking().subscribe({
      next: (res) => {
        this.students = res || [];
        this.computeStatsAndCharts();
      },
      error: (err) => {
        console.error('Error loading tracking data:', err);
        this.students = [];
        this.computeStatsAndCharts();
      }
    });
  }

  private computeStatsAndCharts(): void {
    if (!this.students.length) {
      this.setEmptyStats();
      this.setEmptyCharts();
      return;
    }

    // --- Student follow-up status ---
    this.totalNotifiedStudents = this.students.length;
    this.pendingVisits = this.students.filter(s => !s.comment || s.comment.trim() === '').length;
    this.completedVisits = this.totalNotifiedStudents - this.pendingVisits;

    // --- Courses: count unique students per course ---
    // Each student may have coursSisId[] (courses they are absent in)
    const courseStudentMap = new Map<string, Set<string>>(); // courseId -> Set of studentSisId
    for (const student of this.students) {
      const studentId = student.studentSisId || student.studentName || 'unknown';
      const courses = student.coursSisId || [];
      for (const course of courses) {
        if (!course) continue;
        if (!courseStudentMap.has(course)) {
          courseStudentMap.set(course, new Set());
        }
        courseStudentMap.get(course)!.add(studentId);
      }
    }
    this.totalCoursesInvolved = courseStudentMap.size;

    // Prepare top 5 courses (by number of unique students)
    const courseStats = Array.from(courseStudentMap.entries())
      .map(([courseId, studentsSet]) => ({
        course: courseId.length > 25 ? courseId.substring(0, 22) + '...' : courseId,
        studentCount: studentsSet.size
      }))
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 5);

    const topCourseLabels = courseStats.map(c => c.course);
    const topCourseData = courseStats.map(c => c.studentCount);

    // Bar chart data (horizontal or vertical? We'll use vertical bar with rotation)
    this.topCoursesChartData = {
      labels: topCourseLabels,
      datasets: [
        {
          label: 'Number of Notified Students',
          data: topCourseData,
          backgroundColor: '#FFA726',
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };

    this.topCoursesChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw} student(s)` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Students Notified' } },
        x: { ticks: { autoSkip: false, rotation: 20, font: { size: 11 } }, title: { display: true, text: 'Course' } }
      }
    };

    // --- Status chart (doughnut) ---
    this.statusChartData = {
      labels: ['Not yet visited (Pending)', 'Visited the office'],
      datasets: [
        {
          data: [this.pendingVisits, this.completedVisits],
          backgroundColor: ['#EF5350', '#66BB6A'],
          hoverBackgroundColor: ['#E53935', '#4CAF50'],
          borderWidth: 0
        }
      ]
    };

    this.statusChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw} (${((ctx.raw / this.totalNotifiedStudents) * 100).toFixed(1)}%)` } }
      }
    };
  }

  private setEmptyStats(): void {
    this.totalNotifiedStudents = 0;
    this.pendingVisits = 0;
    this.completedVisits = 0;
    this.totalCoursesInvolved = 0;
  }

  private setEmptyCharts(): void {
    this.statusChartData = {
      labels: ['No data'],
      datasets: [{ data: [1], backgroundColor: ['#B0BEC5'] }]
    };
    this.topCoursesChartData = {
      labels: ['No data'],
      datasets: [{ label: 'Students', data: [0], backgroundColor: '#B0BEC5' }]
    };
  }
}
