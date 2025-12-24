import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Attendance } from '../../../models/entities/attendance';
import { AttendanceService } from '../../../services/attendance.service';

@Component({
  selector: 'app-bar-chart',
  standalone: false,
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.css'
})
export class BarChartComponent implements OnInit {
    constructor(
        private cd: ChangeDetectorRef,
        private attendanceService: AttendanceService,
    ) {}

    ngOnInit(): void {
        this.attendanceService.attendance$.subscribe(data => {
            this.attendance = data
            this.initChart()
        })
    }

    data: any;

    options: any;

    platformId = inject(PLATFORM_ID);

    attendance?: Attendance[]


    initChart() {
    if (isPlatformBrowser(this.platformId)) {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
        const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

        // Generate labels for the last 7 days
        const generateDayLabels = () => {
            const labels = [];
            for (let i = 6; i >= 0; i--) {
                const latest_date = this.attendance!
                    .filter(a => a.class_date) // filter out undefined/null class_date
                    .reduce((latest, current) => {
                        return new Date(current.class_date!) > new Date(latest.class_date!)
                        ? current
                        : latest;
                    }).class_date;
                const date = new Date(latest_date!);
                date.setDate(date.getDate() - i);
                
                // Format as day name (e.g., "Monday", "Tuesday")
                // const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                
                // Alternative format: "Mon 26", "Tue 27", etc.
                const dayName = date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    day: 'numeric' 
                });
                
                labels.push(dayName);
            }
            return labels;
        };

        const generateAttendanceData = (type: string) => {
            const data = [];
            for (let i = 6; i >= 0; i--) {
                const latest_date = this.attendance!
                    .filter(a => a.class_date) // filter out undefined/null class_date
                    .reduce((latest, current) => {
                        return new Date(current.class_date!) > new Date(latest.class_date!)
                        ? current
                        : latest;
                    }).class_date;
                const date = new Date(latest_date!);
                date.setDate(date.getDate() - i);
                
                // Format date to match your attendance data format (adjust as needed)
                const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
                
                const dayAttendance = this.attendance?.filter(a => {
                    const attendanceDate = new Date(a.class_date!).toISOString().split('T')[0];
                    return attendanceDate === dateString && a.attendance === type; // assuming you have a status field
                }) || [];
                
                data.push(dayAttendance.length);
            }
            return data;
        };

        this.data = {             
            labels: generateDayLabels(),             
            datasets: [                 
                {                     
                    type: 'bar',                     
                    label: 'Absences',                     
                    backgroundColor: documentStyle.getPropertyValue('--p-cyan-500'),                     
                    data: generateAttendanceData('absent') // or however you identify absences
                },                 
                {                     
                    type: 'bar',                     
                    label: 'Latenesses',                     
                    backgroundColor: documentStyle.getPropertyValue('--p-gray-500'),                     
                    data: generateAttendanceData('late') // or however you identify latenesses
                },                 
                {                     
                    type: 'bar',                     
                    label: 'Presences',                     
                    backgroundColor: documentStyle.getPropertyValue('--p-orange-500'),                     
                    data: generateAttendanceData('present') // or however you identify presences
                }             
            ]         
        };

        this.options = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }
            }
        };
        this.cd.markForCheck()
    }
  }
}
