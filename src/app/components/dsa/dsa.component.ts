import { Component, OnInit } from '@angular/core';
import { SearchDto } from '../../models/dto/searchDto';

@Component({
  selector: 'app-dsa',
  standalone: false,
  templateUrl: './dsa.component.html',
  styleUrl: './dsa.component.css'
})
export class DsaComponent implements OnInit {
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
