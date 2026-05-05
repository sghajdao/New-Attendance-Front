import { Component, OnInit } from '@angular/core';
import { SearchDto } from '../../models/dto/searchDto';

@Component({
  selector: 'app-monitoring',
  standalone: false,
  templateUrl: './monitoring.component.html',
  styleUrl: './monitoring.component.css'
})
export class MonitoringComponent implements OnInit{
  constructor() { }

  drivers: boolean[] = [true, false, false, false];
  searchDto?: SearchDto;

  ngOnInit(): void {}

  changeDriver(index: number): void {
    this.drivers = [false, false, false, false];
    this.drivers[index] = !this.drivers[index];
  }

  getSearchDto(event: SearchDto) {
    this.searchDto = event;
  }
}
