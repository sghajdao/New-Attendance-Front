import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-monitoring',
  standalone: false,
  templateUrl: './monitoring.component.html',
  styleUrl: './monitoring.component.css'
})
export class MonitoringComponent implements OnInit{
  constructor() { }

  drivers: boolean[] = [true, false, false];

  ngOnInit(): void {}

  changeDriver(index: number): void {
    this.drivers = [false, false, false];
    this.drivers[index] = !this.drivers[index];
  }
}
