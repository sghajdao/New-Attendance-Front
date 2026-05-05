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
  @Input() searchDto?: any; // Optional filter for future use

  // Data
  students: StudentTracking[] = [];
  private subscription?: Subscription;

  // Stats metrics
  totalEvents: number = 0;
  uniqueStudentsCount: number = 0;
  totalCourseEnrollments: number = 0;
  mostCommonType: string = 'N/A';
  avgEventsPerStudent: number = 0;

  // Chart Data
  pieChartData: any;
  pieChartOptions: any;
  barChartData: any;
  barChartOptions: any;

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
        this.computeStatsAndCharts(); // Show empty state
      }
    });
  }

  private computeStatsAndCharts(): void {
    if (!this.students.length) {
      this.setEmptyStats();
      this.setEmptyCharts();
      return;
    }

    // 1. Basic counts
    this.totalEvents = this.students.length;

    // 2. Unique students (using studentSisId)
    const studentMap = new Map<string, { name: string; count: number; courses: number }>();
    // 3. Type frequency map
    const typeMap = new Map<string, number>();
    // 4. Course enrollments sum
    let totalCourses = 0;

    for (const tracking of this.students) {
      const studentId = tracking.studentSisId || tracking.studentName || 'unknown';
      const studentName = tracking.studentName || studentId;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { name: studentName, count: 0, courses: 0 });
      }
      const studentEntry = studentMap.get(studentId)!;
      studentEntry.count++;

      // Courses: sum length of coursSisId array
      const courseCount = tracking.coursSisId?.length || 0;
      studentEntry.courses += courseCount;
      totalCourses += courseCount;

      // Types: handle type array (each tracking may have multiple types)
      const types = tracking.type || [];
      for (const type of types) {
        if (type && type.trim()) {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      }
    }

    this.uniqueStudentsCount = studentMap.size;
    this.totalCourseEnrollments = totalCourses;
    this.avgEventsPerStudent = this.totalEvents / this.uniqueStudentsCount;

    // Most common type
    let maxCount = 0;
    let mostCommon = 'N/A';
    for (const [type, count] of typeMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = type;
      }
    }
    this.mostCommonType = mostCommon;

    // Prepare Pie Chart Data (Type Distribution)
    const pieLabels = Array.from(typeMap.keys());
    const pieData = Array.from(typeMap.values());
    this.pieChartData = {
      labels: pieLabels,
      datasets: [
        {
          data: pieData,
          backgroundColor: [
            '#42A5F5', '#66BB6A', '#FFA726', '#FF7043', '#AB47BC', 
            '#EC407A', '#26C6DA', '#7E57C2', '#FFCA28', '#5C6BC0'
          ],
          hoverBackgroundColor: [
            '#1E88E5', '#43A047', '#FB8C00', '#E64A19', '#8E24AA',
            '#D81B60', '#00ACC1', '#5E35B1', '#F9A825', '#3949AB'
          ]
        }
      ]
    };

    // Prepare Bar Chart Data (Top 5 Students by Tracking Events)
    const studentStats = Array.from(studentMap.entries())
      .map(([id, data]) => ({
        name: data.name.length > 20 ? data.name.substring(0, 18) + '...' : data.name,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const barLabels = studentStats.map(s => s.name);
    const barCounts = studentStats.map(s => s.count);

    this.barChartData = {
      labels: barLabels,
      datasets: [
        {
          label: 'Number of Tracking Events',
          data: barCounts,
          backgroundColor: '#42A5F5',
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    };

    // Chart Options
    this.pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 12 },
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `Events: ${context.raw}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
          title: { display: true, text: 'Number of Events', font: { weight: 'bold' } }
        },
        x: {
          ticks: { autoSkip: false, rotation: 15, font: { size: 11 } },
          title: { display: true, text: 'Students (Top 5)', font: { weight: 'bold' } }
        }
      }
    };
  }

  private setEmptyStats(): void {
    this.totalEvents = 0;
    this.uniqueStudentsCount = 0;
    this.totalCourseEnrollments = 0;
    this.mostCommonType = 'N/A';
    this.avgEventsPerStudent = 0;
  }

  private setEmptyCharts(): void {
    this.pieChartData = {
      labels: ['No Data'],
      datasets: [{ data: [1], backgroundColor: ['#B0BEC5'] }]
    };
    this.barChartData = {
      labels: ['No Data'],
      datasets: [{ label: 'Events', data: [0], backgroundColor: '#B0BEC5' }]
    };
  }
}
