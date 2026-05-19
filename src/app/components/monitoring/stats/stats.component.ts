import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { from, Subscription, combineLatest } from 'rxjs';
import { AttendanceService } from '../../../services/attendance.service';
import { StudentTracking } from '../../../models/entities/studentTracking';
import { SearchDto } from '../../../models/dto/searchDto';
import Chart from 'chart.js/auto';
import * as chartJsDataLabels from 'chartjs-plugin-datalabels';
import { StudentAttendanceDetails } from '../../../models/dto/studentAttendanceDetails';
import { IndexeddbService } from '../../../services/indexeddb.service';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-stats',
  standalone: false,
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent implements OnInit, OnDestroy {
  @Input() searchDto?: SearchDto;

  students: StudentTracking[] = [];
  backup: StudentTracking[] = [];
  info: StudentAttendanceDetails[] = [];
  infoBackup: StudentAttendanceDetails[] = [];
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
  savedStudents: string = '0'

  // Chart data
  pieChartData: any;
  pieChartOptions: any;
  barChartData: any;
  barChartOptions: any;
  statusChartData: any;
  statusChartOptions: any;
  topCoursesChartData: any;
  topCoursesChartOptions: any;

  courseAttendanceChartData: any;
  courseAttendanceChartOptions: any;
  studentAttendanceChartData: any;
  studentAttendanceChartOptions: any;

  coursesAttendanceReport: any
  studentsAttendanceReport: any

  subscriptions: Subscription[] = [];

  constructor(
    private attendanceService: AttendanceService,
    private indexeddbService: IndexeddbService
  ) {
    // Register datalabels plugin once globally
    if (!StatsComponent.dataLabelsRegistered) {
      Chart.register(chartJsDataLabels.default);
      StatsComponent.dataLabelsRegistered = true;
    }
  }

  ngOnInit(): void {
    const sub = combineLatest([
      this.attendanceService.getRedFlagStudents(),
      this.attendanceService.attendanceFilter$
    ])

    .pipe(

      switchMap(([redFlagStudents, filter]) => {

        const studentIds = new Set(
          redFlagStudents.map(r => r.student_sis_id)
        );

        return from(
          this.indexeddbService.getData(
            filter.trmCde || 'SP'
          )
        ).pipe(

          map(data => {

            // Keep only red-flag students
            let filteredInfo = data.filter(student =>
              studentIds.has(student.idNum)
            );

            // Fast lookup sets
            const coursesSet = new Set(filter.courses || []);
            const studentIdsSet = new Set(filter.studentIds || []);

            // Apply term filter
            if (filter.trmCde) {

              filteredInfo = filteredInfo.filter(i =>
                i.trmCde === filter.trmCde
              );

            }

            // Apply course filter
            if (coursesSet.size) {

              filteredInfo = filteredInfo.filter(i =>
                coursesSet.has(i.crsCde)
              );

            }

            // Apply student filter
            if (studentIdsSet.size) {

              filteredInfo = filteredInfo.filter(i =>
                studentIdsSet.has(i.idNum)
              );

            }

            return filteredInfo;
          })

        );
      })

    )

    .subscribe({

      next: filteredData => {

        this.info = filteredData;
        this.infoBackup = [...filteredData];
        this.loadTrackingData();
        this.computeAttendanceCharts();
      },

      error: err => {
        console.error(err);
      }

    });

    this.subscriptions.push(sub);
  }

  private loadTrackingData(): void {
    const sub = this.attendanceService.getTracking().subscribe({
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
    this.subscriptions.push(sub);
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

    // Bar chart - Top 10 students
    const topStudents = Array.from(studentMap.entries())
      .map(([id, data]) => ({ name: data.name.length > 20 ? data.name.substring(0, 18) + '...' : data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    this.barChartData = {
      labels: topStudents.map(s => s.name),
      datasets: [{ label: 'Number of Tracking Events', data: topStudents.map(s => s.count), backgroundColor: '#42A5F5', borderRadius: 6, barPercentage: 0.9, categoryPercentage: 0.9 }]
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
      .slice(0, 10);

    this.topCoursesChartData = {
      labels: topCourses.map(c => c.course),
      datasets: [{ label: 'Notified Students', data: topCourses.map(c => c.studentCount), backgroundColor: '#FFA726', borderRadius: 6, barPercentage: 0.9, categoryPercentage: 0.9 }]
    };

    this.statusChartData = {
      labels: ['Unresponsive (comment empty)', 'Responsive (comment present)'],
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

  private computeAttendanceCharts(): void {
    if (!this.info || this.info.length === 0) {
      this.setEmptyAttendanceCharts();
      return;
    }
  
    // --- Attendance by Course ---
    const courseMap = new Map<string, { present: number; late: number; absent: number }>();
    for (const record of this.info) {
      const course = record.crsCde || 'Unknown Course';
      if (!courseMap.has(course)) {
        courseMap.set(course, { present: 0, late: 0, absent: 0 });
      }
      const stats = courseMap.get(course)!;
      const att = (record.attendance || '').toLowerCase();
      if (att === 'present') stats.present++;
      else if (att === 'late') stats.late++;
      else stats.absent++; // treat any other value (absent, undefined, etc.) as absent
    }
  
    // Convert to array, sort by total attendance, take top 10
    const courseEntries = Array.from(courseMap.entries())
      .map(([course, counts]) => ({
        course: course.length > 25 ? course.substring(0, 22) + '...' : course,
        ...counts,
        total: counts.present + counts.late + counts.absent
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    this.courseAttendanceChartData = {
      labels: courseEntries.map(c => c.course),
      datasets: [
        {
          label: 'Present',
          data: courseEntries.map(c => c.present),
          backgroundColor: '#66BB6A',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        },
        {
          label: 'Late',
          data: courseEntries.map(c => c.late),
          backgroundColor: '#FFA726',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        },
        {
          label: 'Absent',
          data: courseEntries.map(c => c.absent),
          backgroundColor: '#EF5350',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        }
      ]
    };
  
    // --- Attendance by Student (Top 10 by total attendance records) ---
    const studentMap = new Map<string, { name: string; present: number; late: number; absent: number }>();
    for (const record of this.info) {
      const studentId = record.idNum;
      const fullName = `${record.firstName || ''} ${record.lastName || ''}`.trim() || studentId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { name: fullName, present: 0, late: 0, absent: 0 });
      }
      const stats = studentMap.get(studentId)!;
      const att = (record.attendance || '').toLowerCase();
      if (att === 'present') stats.present++;
      else if (att === 'late') stats.late++;
      else stats.absent++;
    }
  
    const studentEntries = Array.from(studentMap.entries())
      .map(([id, data]) => ({
        studentId: id,
        name: data.name.length > 20 ? data.name.substring(0, 18) + '...' : data.name,
        present: data.present,
        late: data.late,
        absent: data.absent,
        total: data.present + data.late + data.absent
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    this.studentAttendanceChartData = {
      labels: studentEntries.map(s => s.name),
      datasets: [
        {
          label: 'Present',
          data: studentEntries.map(s => s.present),
          backgroundColor: '#66BB6A',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        },
        {
          label: 'Late',
          data: studentEntries.map(s => s.late),
          backgroundColor: '#FFA726',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        },
        {
          label: 'Absent',
          data: studentEntries.map(s => s.absent),
          backgroundColor: '#EF5350',
          borderRadius: 4,
          barPercentage: 0.9,
          categoryPercentage: 0.9
        }
      ]
    };
  
    // Options for grouped bar charts (shared)
    const groupedBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}` } },
        datalabels: {
          color: 'white',
          font: { weight: 'bold', size: 12 },
          anchor: 'end',
          align: 'top',
          offset: 2,
          formatter: (value: number) => value > 0 ? value : ''
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Number of Records' } },
        x: { ticks: { autoSkip: false, rotation: 25, font: { size: 11 } }, title: { display: true, text: '' } }
      }
    };
  
    this.courseAttendanceChartOptions = groupedBarOptions;
    this.studentAttendanceChartOptions = groupedBarOptions;

    const studentsGpa: Map<string, number> = new Map();
    for (const i of this.info) {
      const gpa = parseFloat(i.trmGpa || '0');
      if (!isNaN(gpa)) {
        studentsGpa.set(i.idNum, gpa);
      }
    }
    this.savedStudents = `${Array.from(studentsGpa.values()).filter(gpa => gpa >= 2).length} - (${studentsGpa.size > 0 ? ((Array.from(studentsGpa.values()).filter(gpa => gpa >= 2).length / studentsGpa.size) * 100).toFixed(1) : '0'}%)`;
  }
  
  private setEmptyAttendanceCharts(): void {
    const emptyData = {
      labels: ['No Data'],
      datasets: [
        { label: 'Present', data: [0], backgroundColor: '#B0BEC5', barPercentage: 0.9, categoryPercentage: 0.9 },
        { label: 'Late', data: [0], backgroundColor: '#B0BEC5', barPercentage: 0.9, categoryPercentage: 0.9 },
        { label: 'Absent', data: [0], backgroundColor: '#B0BEC5', barPercentage: 0.9, categoryPercentage: 0.9 }
      ]
    };
    this.courseAttendanceChartData = emptyData;
    this.studentAttendanceChartData = emptyData;
    this.courseAttendanceChartOptions = this.getBarOptions('', 'Records', '#B0BEC5');
    this.studentAttendanceChartOptions = this.getBarOptions('', 'Records', '#B0BEC5');
  }

  // ========== CSV Export Methods ==========
  
  /**
   * Generic method to download CSV content
   * @param rows Array of arrays representing rows (first row should be headers)
   * @param filename Name of the file to download (without extension)
   */
  // ========== CSV Export Methods (Full Data) ==========

  private downloadCSV(rows: any[][], filename: string): void {
    if (!rows.length) {
      console.warn('No data to export');
      return;
    }
    const csvContent = rows.map(row => 
      row.map(cell => {
        if (cell === undefined || cell === null) return '';
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export ALL students with tracking event counts (not just top 10)
   */
  exportTopStudents(): void {
    if (!this.students.length) return;

    // Recompute student event counts from full data
    const studentMap = new Map<string, { id: string; name: string; count: number }>();
    for (const tracking of this.students) {
      const studentId = tracking.studentSisId || tracking.studentName || 'unknown';
      const studentName = tracking.studentName || studentId;
      studentMap.set(studentId, {
        id: studentId,
        name: studentName,
        count: (studentMap.get(studentId)?.count || 0) + 1
      });
    }

    const rows = Array.from(studentMap.entries())
      .map(([id, data]) => [data.id, data.name, data.count])
      .sort((a, b) => (b[2] as number) - (a[2] as number)); // sort descending

    this.downloadCSV([['Student ID', 'Student Name', 'Number of Tracking Events'], ...rows], 'all_notified_students');
  }

  /**
   * Export ALL courses with notified student counts (not just top 10)
   */
  exportTopCourses(): void {
    if (!this.students.length) return;

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

    const rows = Array.from(courseStudentMap.entries())
      .map(([course, studentsSet]) => [course, studentsSet.size])
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    this.downloadCSV([['Course', 'Notified Students'], ...rows], 'all_courses_notified');
  }

  /**
   * Export ALL courses attendance data (not limited to top 10)
   */
  exportCourseAttendance(): void {
    if (!this.info || !this.info.length) return;

    const courseMap = new Map<string, { present: number; late: number; absent: number }>();
    for (const record of this.info) {
      const course = record.crsCde || 'Unknown Course';
      if (!courseMap.has(course)) {
        courseMap.set(course, { present: 0, late: 0, absent: 0 });
      }
      const stats = courseMap.get(course)!;
      const att = (record.attendance || '').toLowerCase();
      if (att === 'present') stats.present++;
      else if (att === 'late') stats.late++;
      else stats.absent++;
    }

    const rows = Array.from(courseMap.entries()).map(([course, counts]) => [
      course,
      counts.present,
      counts.late,
      counts.absent,
      counts.present + counts.late + counts.absent
    ]).sort((a, b) => (b[4] as number) - (a[4] as number)); // sort by total

    this.downloadCSV([['Course', 'Present', 'Late', 'Absent', 'Total'], ...rows], 'all_course_attendance');
  }

  /**
   * Export ALL students attendance data (not limited to top 10)
   */
  exportStudentAttendance(): void {
    if (!this.info || !this.info.length) return;

    const studentMap = new Map<string, { id: string; name: string; present: number; late: number; absent: number }>();
    for (const record of this.info) {
      const studentId = record.idNum;
      const fullName = `${record.firstName || ''} ${record.lastName || ''}`.trim() || studentId;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { id: studentId, name: fullName, present: 0, late: 0, absent: 0 });
      }
      const stats = studentMap.get(studentId)!;
      const att = (record.attendance || '').toLowerCase();
      if (att === 'present') stats.present++;
      else if (att === 'late') stats.late++;
      else stats.absent++;
    }

    const rows = Array.from(studentMap.entries()).map(([id, data]) => [
      data.id,
      data.name,
      data.present,
      data.late,
      data.absent,
      data.present + data.late + data.absent
    ]).sort((a, b) => (b[4] as number) - (a[4] as number));

    this.downloadCSV([['Student ID', 'Student Name', 'Present', 'Late', 'Absent', 'Total'], ...rows], 'all_student_attendance');
  }

  /**
   * Export Type Distribution (pie chart) – this is already full data (all types)
   */
  exportTypeDistribution(): void {
    if (!this.students.length) return;

    const typeMap = new Map<string, number>();
    for (const tracking of this.students) {
      const types = tracking.type || [];
      for (const type of types) {
        if (type && type.trim()) {
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        }
      }
    }

    const rows = Array.from(typeMap.entries()).map(([type, count]) => [type, count]);
    this.downloadCSV([['Type', 'Count'], ...rows], 'type_distribution');
  }

  /**
   * Export Follow-up Status – this is already full data (only two categories)
   */
  exportFollowUpStatus(): void {
    if (!this.students.length) return;

    const pending = this.students.filter(s => !s.comment || s.comment.trim() === '').length;
    const completed = this.students.length - pending;

    const rows = [
      ['Pending (comment empty)', pending],
      ['Visited (comment present)', completed]
    ];
    this.downloadCSV([['Status', 'Count'], ...rows], 'follow_up_status');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
